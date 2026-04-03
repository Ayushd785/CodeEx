# CodeEx Roadmap (Checkpoint-Driven)

This roadmap is intentionally incremental.
We will not build the full production architecture on day one.
Each phase has a clear checkpoint that must pass before moving to the next phase.

## Build Philosophy

- Start with a working end-to-end prototype first.
- Add one major system concern per phase.
- Keep data model and APIs stable where possible.
- Do not introduce infrastructure complexity before product flow works.
- Every phase ends with a demoable checkpoint.

## Working Method

- Complete one phase fully before starting the next.
- Keep a short phase branch or changelog entry for every phase.
- Review unknowns early and convert them into explicit decisions.
- Track technical debt introduced in each phase and resolve by the next phase.
- Keep architecture documents updated as behavior changes.

## Core Product Flow (constant across phases)

1. User submits code for a problem.
2. System creates a submission record in DB.
3. Submission status starts as `PENDING`.
4. Execution engine runs code against test case input.
5. System captures output, runtime metadata, and errors.
6. System compares output vs expected output.
7. System stores verdict (`ACCEPTED`, `WRONG_ANSWER`, `RUNTIME_ERROR`, etc.).
8. Submission status moves to `COMPLETED` (or `FAILED` if infra issue).

This flow is implemented in Phase 1 and preserved through all next phases.

## Status Model (canonical)

- `PENDING`: Submission created, waiting to be picked up.
- `RUNNING`: Execution started by local runner or worker.
- `COMPLETED`: Execution finished and verdict is final.
- `FAILED`: Infra-level failure (worker crash, queue outage, image pull failure).

## Verdict Model (canonical)

- `ACCEPTED`
- `WRONG_ANSWER`
- `RUNTIME_ERROR`
- `TIME_LIMIT_EXCEEDED`
- `COMPILATION_ERROR`
- `SYSTEM_ERROR`

`FAILED` status should usually pair with `SYSTEM_ERROR` unless a better infra-specific code is added later.

---

## Phase 1: Local Working Prototype (No Docker, No Queue)

## Goal
Deliver a complete backend prototype where submission, execution, grading, and status updates work on a single machine.

## Non-Goals

- No container isolation yet.
- No queue or separate worker process.
- No horizontal scaling concerns.
- No advanced auth or role management.

## Scope

- One API server.
- One DB (PostgreSQL).
- Local process execution (host machine runtime).
- Synchronous or simple async execution in-process.
- Minimal auth optional for prototype.

## Suggested Tech Choices (Phase 1)

- API: Node.js + Express + TypeScript
- DB: PostgreSQL + Prisma
- Validation: Zod
- Process execution: child process (`spawn`/`execFile`)
- Logging: structured JSON logs with submission correlation

## Minimum Data Model

- `Problem`
- `TestCase`
- `Submission`

Suggested `Submission` fields:

- `id`
- `problemId`
- `language`
- `code`
- `status` (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`)
- `verdict` (`ACCEPTED`, `WRONG_ANSWER`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`, `COMPILATION_ERROR`, `SYSTEM_ERROR`)
- `actualOutput`
- `expectedOutput` (for evaluated test case or summary)
- `errorMessage`
- `createdAt`, `updatedAt`, `completedAt`

Recommended additions:

- `executionTimeMs`
- `memoryUsedMb` (optional now, mandatory later)
- `testCaseResultsJson` (optional in Phase 1, useful for debugging)

## Phase 1 Workstreams

1. Problem and test case setup:
  - Seed at least 2-3 problems.
  - Include both sample and hidden test cases.
2. Submission write path:
  - Validate payload.
  - Persist as `PENDING`.
  - Return `submissionId` immediately.
3. Runner integration:
  - Start execution from API process.
  - Support at least one language initially.
4. Grading:
  - Normalize output before compare (trim trailing spaces/newlines).
  - Persist verdict and execution metadata.
5. Read path:
  - Fetch by `submissionId` and expose current status.
6. Error handling:
  - Distinguish user-code failure from system failure.
7. Observability baseline:
  - Log state transitions and timing per submission.

## Required API Endpoints

- `POST /submissions`
  - Creates submission with `PENDING`
  - Starts execution
  - Returns `submissionId`
- `GET /submissions/:id`
  - Returns current status and verdict details

Optional in this phase:

- `GET /problems/:id`
- `POST /problems` (admin/dev only)

Recommended response shape for `GET /submissions/:id`:

- `id`
- `status`
- `verdict`
- `actualOutput`
- `expectedOutput` (if policy allows exposing)
- `errorMessage`
- `executionTimeMs`
- `createdAt`
- `updatedAt`

## Execution Flow (Phase 1)

1. Validate payload (`problemId`, `language`, `code`).
2. Create submission row as `PENDING`.
3. Update status to `RUNNING`.
4. Execute code locally for target language.
5. Capture stdout/stderr and exit code.
6. Compare stdout with expected output.
7. Set verdict.
8. Update submission status to `COMPLETED`.
9. If execution infra fails, mark `FAILED` with `SYSTEM_ERROR`.

## Testing Plan (Phase 1)

- Unit tests:
  - Output comparator normalization.
  - Verdict mapping logic.
- Integration tests:
  - `POST /submissions` writes `PENDING` first.
  - Status transitions happen in order.
- Manual test matrix:
  - Accepted solution.
  - Wrong answer.
  - Runtime error.
  - Compilation error (if compiled language supported).
  - Timeout simulation.

## Risks and Mitigations (Phase 1)

- Risk: API thread blocked by execution.
  - Mitigation: run execution asynchronously and avoid long sync operations.
- Risk: orphan running processes.
  - Mitigation: add hard timeout and kill child process tree.
- Risk: noisy logs, hard debugging.
  - Mitigation: enforce `submissionId` in every related log line.

## Checkpoint 1 (must pass)

- User can submit code and receives a valid `submissionId`.
- DB entry is created with `PENDING` before execution starts.
- Status transitions are visible (`PENDING` -> `RUNNING` -> `COMPLETED`).
- Correct output returns `ACCEPTED`.
- Incorrect output returns `WRONG_ANSWER`.
- Runtime failure is stored as `RUNTIME_ERROR` or `COMPILATION_ERROR`.

Demo script for Checkpoint 1:

1. Submit valid solution and poll until `COMPLETED` + `ACCEPTED`.
2. Submit wrong solution and confirm `WRONG_ANSWER`.
3. Submit crashing solution and confirm error verdict.
4. Show DB rows proving state transitions.

## Exit Criteria

- At least 20 manual test submissions run successfully.
- No stuck `RUNNING` submissions in happy path.
- Logs provide enough traceability by `submissionId`.

Artifacts to produce at phase close:

- API contract doc for submission endpoints.
- Schema snapshot and migration notes.
- Short runbook: how to submit, inspect, and debug locally.

---

## Phase 2: Isolated Execution with Docker

## Goal
Move code execution from host runtime to isolated Docker containers, while keeping Phase 1 API and DB behavior unchanged.

## Non-Goals

- No queue introduction yet.
- No worker process split yet.
- No Kubernetes yet.

## Scope

- API remains mostly the same.
- Execution engine uses Docker per submission.
- Language-specific runtime images.
- Resource limits introduced (time, memory, CPU).

## Container Security Baseline

- Run as non-root user.
- Disable networking for execution containers.
- Read-only filesystem where possible.
- Strict CPU and memory limits.
- Enforced timeout with kill and cleanup.

## Phase 2 Workstreams

1. Language image design:
  - Build minimal runtime images per language.
  - Keep pinned versions for reproducibility.
2. Runner replacement:
  - Swap local process runner for Docker runner.
  - Preserve API and DB contract from Phase 1.
3. File/input handling:
  - Secure temp workspace per submission.
  - Copy code and test input into container safely.
4. Resource governance:
  - Per-run limits for memory and CPU.
  - Hard timeout with cleanup.
5. Cleanup and lifecycle:
  - Ensure no orphan containers/volumes.
6. Metrics:
  - Track pull time, container start time, run time.

## What Changes from Phase 1

- Replace local process runner with container runner.
- Add container lifecycle management:
  - Create container
  - Copy code/input
  - Run with limits
  - Collect output
  - Destroy container
- Add timeout and safety guardrails.

## Testing Plan (Phase 2)

- Integration tests:
  - Submission flow unchanged from client perspective.
  - Same verdict for same code/input as Phase 1.
- Security tests:
  - Verify network disabled from inside container.
  - Verify process cannot access host filesystem.
- Reliability tests:
  - Timeout test kills container reliably.
  - Forced crash still updates submission to terminal state.

## Risks and Mitigations (Phase 2)

- Risk: first run is slow due to image pull.
  - Mitigation: image pre-pull step during startup/deploy.
- Risk: temp file leaks.
  - Mitigation: use deterministic cleanup in `finally` blocks.
- Risk: language image drift.
  - Mitigation: tag images with explicit versions and lock build source.

## Checkpoint 2 (must pass)

- Same submission API contract still works.
- Submission states and verdict logic remain unchanged.
- Code runs only inside Docker containers.
- Containers are cleaned after execution.
- Time and memory limits are enforced.

Demo script for Checkpoint 2:

1. Run accepted/wrong/error test cases and show unchanged API behavior.
2. Show container lifecycle logs per submission.
3. Show proof that execution does not happen on host runtime path.

## Exit Criteria

- No host-level code execution path remains for normal runs.
- No orphan containers after load test.
- Cold start and warm start container timings measured.

Artifacts to produce at phase close:

- Execution image catalog with versions.
- Sandbox hardening checklist.
- Performance note: cold vs warm execution path.

---

## Phase 3: Queue + Worker Architecture (2 Servers)

## Goal
Decouple request handling from code execution using queue-based asynchronous processing.

## Non-Goals

- No frontend complexity changes yet.
- No cluster autoscaling yet.

## Target Architecture

- API Server:
  - Accepts submissions
  - Stores DB row (`PENDING`)
  - Pushes job to queue
  - Exposes submission status APIs
- Worker Server:
  - Pulls jobs from queue
  - Runs execution in Docker
  - Updates DB with result and verdict

## Queue Design Decisions

- Job payload should include `submissionId` and minimal execution metadata.
- DB remains source of truth for final state.
- Queue supports retries with bounded attempts.
- Worker must be idempotent by `submissionId`.

## Scope

- Introduce Redis + queue system.
- One or more worker processes.
- Retry policy and dead-letter strategy.
- Idempotent worker processing by `submissionId`.

## Phase 3 Workstreams

1. API producer path:
  - Create submission row.
  - Push queue job.
  - Return `submissionId` quickly.
2. Worker consumer path:
  - Pull job and set `RUNNING`.
  - Execute in Docker.
  - Grade and persist final result.
3. Idempotency and retries:
  - Detect already-terminal submissions.
  - Prevent duplicate finalization.
4. Failure handling:
  - Retries for transient infra errors.
  - Dead-letter queue or failed-job bucket.
5. Visibility:
  - Queue depth metrics.
  - Job processing latency metrics.

## Submission Flow (Phase 3)

1. API writes submission as `PENDING`.
2. API publishes job with `submissionId`.
3. Worker consumes job and marks `RUNNING`.
4. Worker executes in Docker.
5. Worker grades output and writes final result.
6. Worker marks `COMPLETED` or `FAILED`.

## API/Worker Contract Notes

- API must never mark final verdict in this phase.
- Worker owns `RUNNING -> terminal` transitions.
- State transitions should be monotonic and audited.

## Testing Plan (Phase 3)

- Integration tests:
  - API returns quickly while worker processes async.
  - Worker updates status and verdict correctly.
- Resilience tests:
  - Kill worker mid-job and recover.
  - Restart Redis and verify behavior/retry strategy.
- Idempotency tests:
  - Process duplicate job and verify single final result.

## Risks and Mitigations (Phase 3)

- Risk: duplicate processing from retries.
  - Mitigation: terminal-state guard and idempotency key on submission.
- Risk: stuck jobs.
  - Mitigation: queue timeout, retry policy, and DLQ monitoring.
- Risk: API accepted but queue publish failed.
  - Mitigation: transactional outbox pattern (optional enhancement).

## Checkpoint 3 (must pass)

- API and worker can run independently.
- Stopping API does not kill in-progress worker execution.
- Queue backlog drains correctly when workers recover.
- Duplicate delivery does not corrupt final state.
- Submission eventually reaches terminal state (`COMPLETED` or `FAILED`).

Demo script for Checkpoint 3:

1. Submit burst of requests while API remains responsive.
2. Stop worker, create backlog, restart worker, verify drain.
3. Show one duplicate-delivery simulation and stable final state.

## Exit Criteria

- Load test shows API remains responsive during heavy execution load.
- Worker restart does not lose queued jobs.
- Observability exists for queue depth and job latency.

Artifacts to produce at phase close:

- API-worker sequence diagram.
- Queue retry/DLQ policy document.
- Runbook: restart and backlog recovery.

---

## Phase 4: Frontend Application

## Goal
Provide user-facing interface for problem solving and submission tracking.

## Non-Goals

- No advanced collaborative editor features.
- No multi-tenant role/permission complexity.

## Scope

- Problem list and problem detail page.
- Code editor + language selector.
- Submit action and submission history.
- Verdict and execution details display.
- Polling or websocket updates for status transitions.

## Phase 4 Workstreams

1. Problem browsing UX:
  - Problem list with filters (difficulty/status optional).
  - Problem detail with statement and examples.
2. Editor and submission UX:
  - Language selector.
  - Code editor with starter template.
  - Submit action with loading and disabled-state handling.
3. Submission tracking UX:
  - Live status updates via polling or websockets.
  - Result pane with verdict, output, error, runtime.
4. Reliability UX:
  - Retry/refresh paths for temporary failures.
  - Friendly empty/error states.
5. Client observability:
  - Basic telemetry for submit latency and errors.

## UX Requirements

- User sees immediate acknowledgement after submit.
- User can track status: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`.
- Verdict and output are clearly presented.
- Error messages are understandable and actionable.

## Frontend Quality Bar

- Mobile and desktop layouts both usable.
- Keyboard flow supports code-submit-check loop.
- No blocking UI state without visible feedback.
- Submission page remains responsive during async processing.

## Testing Plan (Phase 4)

- Component tests:
  - Editor submit button state logic.
  - Result rendering for each verdict.
- Integration tests:
  - Full flow from selecting problem to verdict display.
- E2E tests:
  - Accepted path.
  - Wrong answer path.
  - Runtime error path.
  - Worker-delay path.

## Risks and Mitigations (Phase 4)

- Risk: stale status in UI.
  - Mitigation: polling fallback even if websocket enabled.
- Risk: confusing verdict rendering.
  - Mitigation: standard verdict-to-message map with examples.
- Risk: large output freezes UI.
  - Mitigation: output truncation with expand-on-demand.

## Checkpoint 4 (must pass)

- A user can solve and submit fully from UI.
- UI reflects real backend states correctly.
- UI handles delayed execution gracefully.
- At least one happy path and three failure paths are user-test verified.

Demo script for Checkpoint 4:

1. Solve and submit accepted code from UI.
2. Submit wrong code and show clear feedback.
3. Simulate delayed worker and confirm non-blocking UI.

## Exit Criteria

- End-to-end demo: pick problem -> write code -> submit -> see verdict.
- No blocking UX issues for basic usage.

Artifacts to produce at phase close:

- Frontend flow screenshots/gif for docs.
- UX error-state catalog.
- E2E test report.

---

## Phase 5: Kubernetes + KEDA Architecture

## Goal
Make execution system horizontally scalable with event-driven autoscaling.

## Non-Goals

- Not optimizing every cost/perf edge case yet.
- Not replacing app architecture established in prior phases.

## Scope

- Containerize API and worker for cluster deployment.
- Deploy Redis/Postgres (managed service preferred in real environments).
- KEDA autoscaling for worker based on queue length.
- ConfigMaps, Secrets, resource requests/limits, HPA behavior.

## Phase 5 Workstreams

1. Containerization hardening:
  - Build reproducible API and worker images.
  - Define probes and resource requests/limits.
2. Kubernetes baseline:
  - Namespaces, deployments, services, ingress.
  - Secrets/config handling per environment.
3. KEDA integration:
  - Scale worker based on queue depth.
  - Tune trigger thresholds.
4. Data and state:
  - Managed Postgres/Redis preferred.
  - Ensure network policies and secure access.
5. Load and resilience validation:
  - Burst submission tests.
  - Scale-out and scale-in behavior validation.

## KEDA Focus

- Scale workers from zero/low baseline based on queue metrics.
- Tune cooldown, polling interval, and max replica limits.
- Prevent runaway scaling and DB exhaustion.

## Observability Requirements (Phase 5)

- Dashboard panels for:
  - queue depth over time
  - worker replicas over time
  - submission latency distribution
  - failure rate by verdict/system error type
- Alerts:
  - queue not draining for N minutes
  - worker crash loop
  - DB connection saturation

## Testing Plan (Phase 5)

- Scale tests:
  - low traffic steady state
  - burst traffic
  - sustained high traffic
- Failure tests:
  - worker pod kill during execution
  - temporary Redis disruption
  - temporary DB latency increase

## Risks and Mitigations (Phase 5)

- Risk: aggressive autoscaling overloads DB.
  - Mitigation: cap max replicas and set DB-aware limits.
- Risk: cold start delays impact SLA.
  - Mitigation: baseline min replicas for critical windows.
- Risk: misconfigured secrets/config drift.
  - Mitigation: GitOps and environment validation checks.

## Checkpoint 5 (must pass)

- Queue spike triggers worker scale-out automatically.
- Idle queue scales workers down.
- Submission latency improves under burst traffic.
- No data integrity issues during scaling events.

Demo script for Checkpoint 5:

1. Generate queue spike and show worker autoscaling.
2. Let queue drain and confirm scale-down behavior.
3. Show stable correctness of verdicts through scaling event.

## Exit Criteria

- Repeatable cluster deployment manifests or Helm chart.
- Capacity test results documented.
- Operational runbook for scale and failure recovery exists.

Artifacts to produce at phase close:

- Kubernetes manifests or Helm chart.
- KEDA tuning notes and chosen thresholds.
- Capacity test report with recommended replica bounds.

---

## Phase 6: Production Deployment and Operations

## Goal
Deploy a stable, observable, and secure production system.

## Non-Goals

- No major feature changes during go-live hardening.
- No architectural rewrites unless required by severe risk.

## Scope

- CI/CD pipeline for build, test, and deploy.
- Environment separation (`dev`, `staging`, `prod`).
- Monitoring, alerting, structured logging, tracing.
- Security hardening, secrets management, backup strategy.
- SLOs, incident response basics, rollback strategy.

## Phase 6 Workstreams

1. Release engineering:
  - CI checks (lint, unit, integration, e2e smoke).
  - Build and publish versioned images.
  - Progressive deployment strategy.
2. Environment strategy:
  - `dev`, `staging`, `prod` parity where practical.
  - Config/secrets promotion model.
3. Reliability and operations:
  - SLO definition and error budget policy.
  - On-call escalation and incident templates.
4. Security and compliance baseline:
  - Secret rotation process.
  - Dependency and image vulnerability scanning.
  - Audit trails for deployments.
5. Data safety:
  - Backup schedule and retention.
  - Restore drill and RTO/RPO validation.

## Production Checklist

- Health checks and readiness probes.
- Centralized logs with `submissionId` correlation.
- Metrics dashboards:
  - submission throughput
  - queue depth
  - worker success/failure rates
  - p95/p99 execution latency
- Alerts for stuck queue, high failure rate, high latency.
- Database backup and restore drill.

Additional production readiness checks:

- Rate limiting and abuse protections.
- CORS and auth token policy review.
- Log redaction policy for sensitive content.
- Cost monitoring and budget alerts.

## Testing Plan (Phase 6)

- Staging sign-off pack:
  - functional smoke tests
  - peak load smoke test
  - rollback rehearsal
- Game-day drills:
  - queue outage simulation
  - worker crash storm simulation
  - partial region/network impairment simulation (if applicable)

## Risks and Mitigations (Phase 6)

- Risk: deployment causes hidden regression.
  - Mitigation: canary/blue-green rollout and fast rollback.
- Risk: alert fatigue or blind spots.
  - Mitigation: tune high-signal alerts and clear severity policy.
- Risk: backup exists but restore fails.
  - Mitigation: scheduled restore drills with documented results.

## Checkpoint 6 (must pass)

- Staging sign-off with production-like load.
- Controlled production rollout succeeds.
- Rollback tested and documented.
- On-call runbook is available.

Demo script for Checkpoint 6:

1. Perform controlled prod rollout with health verification.
2. Trigger rollback drill and measure recovery time.
3. Show dashboard + alerting + on-call runbook walkthrough.

## Exit Criteria

- System is production-ready with documented operations.
- Team can deploy, monitor, and recover confidently.

Artifacts to produce at phase close:

- Production readiness report.
- Runbooks (deploy, rollback, incident, restore).
- Post-launch monitoring plan (first 2-4 weeks).

---

## Cross-Phase Engineering Standards

These apply in every phase.

- API contracts versioned and documented.
- Submission lifecycle states are explicit and immutable in history.
- All state transitions logged with timestamps.
- Test strategy grows with system complexity:
  - Phase 1-2: unit + integration
  - Phase 3+: queue/worker resilience tests
  - Phase 4+: end-to-end tests
- Every phase includes a short retro: what worked, what to simplify next.

## Cross-Phase Definition of Done

- Docs updated (API, architecture notes, runbook deltas).
- Tests for newly introduced logic are committed and green.
- Basic observability for new components exists.
- Risk list updated with resolved and open items.
- Next phase prerequisites are explicitly validated.

## Phase Gate Template (Use at end of every phase)

1. What was planned vs completed.
2. Checkpoint evidence (screenshots/logs/test reports).
3. Open defects and severity.
4. Performance snapshot.
5. Decision log updates.
6. Go/No-Go for next phase.

---

## Recommended Execution Order Summary

1. Phase 1: Make it work locally end-to-end.
2. Phase 2: Make execution safe via Docker isolation.
3. Phase 3: Make backend scalable via queue + workers.
4. Phase 4: Make it usable with frontend UX.
5. Phase 5: Make it elastic with Kubernetes + KEDA.
6. Phase 6: Make it production-grade with deployment and operations.

This keeps complexity controlled while ensuring continuous, testable progress.
