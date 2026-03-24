# Code Execution Platform — Build Roadmap

> A distributed, scalable code execution engine similar to LeetCode/HackerRank.
> This roadmap breaks down the entire build into phases, milestones, and actionable steps.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   ┌──────────┐      ┌──────────────┐      ┌─────────┐      ┌───────────────┐   │
│   │  Browser │─────▶│  API Server  │─────▶│  Redis  │◀─────│    Worker     │   │
│   │  (React) │◀─────│  (Express)   │      │ (Queue) │      │  (Dockerode)  │   │
│   └──────────┘  WS  └──────┬───────┘      └────┬────┘      └───────┬───────┘   │
│                            │                   │                   │           │
│                            │              ┌────┴────┐              │           │
│                            └─────────────▶│ Postgres│◀─────────────┘           │
│                                           │  (DB)   │                          │
│                                           └─────────┘                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Services:**
- **API Server** — handles HTTP requests, authentication, pushes jobs to queue
- **Worker** — pulls jobs from queue, runs code in Docker sandbox, grades output
- **Redis** — job queue (BullMQ) + pub/sub for real-time results
- **PostgreSQL** — persistent storage for users, problems, submissions

---

## Technology Stack

| Component        | Technology                  | Purpose                                      |
|------------------|-----------------------------|----------------------------------------------|
| Language         | TypeScript                  | Type safety across the entire codebase       |
| API Server       | Node.js + Express           | REST API, WebSocket server                   |
| Authentication   | JWT (jsonwebtoken)          | Stateless auth tokens                        |
| ORM              | Prisma                      | Type-safe database access                    |
| Validation       | Zod                         | Runtime schema validation                    |
| Database         | PostgreSQL                  | Persistent storage                           |
| Job Queue        | Redis + BullMQ              | Async job processing with retries            |
| Real-time        | Socket.io + Redis Adapter   | WebSocket with multi-server support          |
| Worker           | Node.js + Dockerode         | Programmatic Docker container management     |
| Sandbox          | Docker containers           | Isolated code execution                      |
| Frontend         | React + TypeScript + Vite   | Code editor UI                               |
| Local Dev        | Docker Compose              | One-command local environment                |
| Orchestration    | Kubernetes + KEDA           | Production scaling (Phase 3)                 |

---

## Project Structure (Production-Grade)

We follow a clean **Controller → Service → Repository** architecture:

```
code-execution-platform/
│
├── docker-compose.yml              # Local development orchestration
├── .env.example                    # Environment template
├── .gitignore
├── README.md
│
├── api/                            # API Server (Express + TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   ├── Dockerfile
│   │
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   ├── migrations/             # Migration history
│   │   └── seed.ts                 # Seed data script
│   │
│   └── src/
│       ├── index.ts                # Entry point — bootstraps the app
│       ├── app.ts                  # Express app configuration
│       ├── server.ts               # HTTP + WebSocket server setup
│       │
│       ├── config/                 # Configuration & environment
│       │   ├── index.ts            # Exports all config
│       │   ├── env.ts              # Environment variable loader (typed)
│       │   ├── database.ts         # Prisma client singleton
│       │   ├── redis.ts            # Redis client singleton
│       │   └── queue.ts            # BullMQ queue configuration
│       │
│       ├── types/                  # Shared TypeScript types
│       │   ├── index.ts            # Re-exports all types
│       │   ├── auth.types.ts       # Auth-related types
│       │   ├── problem.types.ts    # Problem-related types
│       │   ├── submission.types.ts # Submission-related types
│       │   └── queue.types.ts      # Job payload types
│       │
│       ├── routes/                 # Route definitions (thin layer)
│       │   ├── index.ts            # Route aggregator
│       │   ├── auth.routes.ts      # /api/auth/*
│       │   ├── problem.routes.ts   # /api/problems/*
│       │   └── submission.routes.ts# /api/submissions/*
│       │
│       ├── controllers/            # Request handlers (HTTP logic only)
│       │   ├── auth.controller.ts
│       │   ├── problem.controller.ts
│       │   └── submission.controller.ts
│       │
│       ├── services/               # Business logic (reusable, testable)
│       │   ├── auth.service.ts     # Password hashing, JWT generation
│       │   ├── problem.service.ts  # Problem CRUD operations
│       │   ├── submission.service.ts # Submission handling, job queuing
│       │   └── queue.service.ts    # BullMQ producer abstraction
│       │
│       ├── repositories/           # Data access layer (Prisma queries)
│       │   ├── user.repository.ts
│       │   ├── problem.repository.ts
│       │   └── submission.repository.ts
│       │
│       ├── middleware/             # Express middleware
│       │   ├── auth.middleware.ts  # JWT verification
│       │   ├── error.middleware.ts # Global error handler
│       │   ├── validate.middleware.ts # Zod validation middleware
│       │   └── logger.middleware.ts   # Request logging
│       │
│       ├── validators/             # Zod schemas for request validation
│       │   ├── auth.validator.ts
│       │   ├── problem.validator.ts
│       │   └── submission.validator.ts
│       │
│       ├── websocket/              # Socket.io setup
│       │   ├── index.ts            # WebSocket initialization
│       │   └── handlers.ts         # Event handlers
│       │
│       └── utils/                  # Utility functions
│           ├── response.ts         # Standardized API responses
│           ├── errors.ts           # Custom error classes
│           └── logger.ts           # Winston/Pino logger setup
│
├── worker/                         # Execution Worker (TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   ├── Dockerfile
│   │
│   └── src/
│       ├── index.ts                # Entry point — starts BullMQ worker
│       │
│       ├── config/
│       │   ├── index.ts
│       │   ├── env.ts              # Environment variables
│       │   ├── database.ts         # Prisma client
│       │   ├── redis.ts            # Redis connection
│       │   └── docker.ts           # Dockerode client configuration
│       │
│       ├── types/
│       │   ├── index.ts
│       │   ├── job.types.ts        # Job payload interfaces
│       │   └── execution.types.ts  # Execution result interfaces
│       │
│       ├── processors/             # Job processors
│       │   └── execution.processor.ts # Main job handler
│       │
│       ├── executor/               # Docker execution logic
│       │   ├── index.ts            # Executor factory
│       │   ├── base.executor.ts    # Abstract base class
│       │   ├── python.executor.ts  # Python-specific execution
│       │   └── java.executor.ts    # Java-specific execution (compile + run)
│       │
│       ├── sandbox/                # Container management
│       │   ├── container.ts        # Docker container lifecycle
│       │   └── limits.ts           # Resource limit configuration
│       │
│       ├── grader/                 # Output grading logic
│       │   ├── comparator.ts       # Output comparison strategies
│       │   └── verdict.ts          # Verdict determination
│       │
│       ├── services/
│       │   ├── submission.service.ts # Update submission status in DB
│       │   └── notification.service.ts # Publish results to Redis
│       │
│       └── utils/
│           ├── logger.ts
│           └── temp-file.ts        # Temp directory management
│
├── shared/                         # Shared code between api and worker
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── types/                  # Shared type definitions
│       │   ├── submission.ts
│       │   ├── verdict.ts
│       │   └── language.ts
│       ├── constants/              # Shared constants
│       │   └── languages.ts        # Supported language configs
│       └── utils/
│           └── index.ts
│
├── sandbox-images/                 # Docker images for code execution
│   ├── python3/
│   │   └── Dockerfile
│   ├── java/
│   │   └── Dockerfile
│   └── build-all.sh                # Script to build all images
│
├── frontend/                       # React + TypeScript + Vite
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── Dockerfile
│   │
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── vite-env.d.ts
│       │
│       ├── api/                    # API client layer
│       │   ├── client.ts           # Axios instance with interceptors
│       │   ├── auth.api.ts
│       │   ├── problems.api.ts
│       │   └── submissions.api.ts
│       │
│       ├── hooks/                  # Custom React hooks
│       │   ├── useAuth.ts
│       │   ├── useProblems.ts
│       │   ├── useSubmission.ts
│       │   └── useSocket.ts
│       │
│       ├── context/                # React context providers
│       │   ├── AuthContext.tsx
│       │   └── SocketContext.tsx
│       │
│       ├── components/             # Reusable UI components
│       │   ├── ui/                 # Generic components (Button, Input, etc.)
│       │   ├── layout/             # Layout components (Header, Sidebar)
│       │   ├── editor/             # Monaco editor wrapper
│       │   └── problem/            # Problem-specific components
│       │
│       ├── pages/                  # Page components (route targets)
│       │   ├── HomePage.tsx
│       │   ├── LoginPage.tsx
│       │   ├── RegisterPage.tsx
│       │   ├── ProblemsPage.tsx
│       │   └── ProblemDetailPage.tsx
│       │
│       ├── types/                  # Frontend TypeScript types
│       │   └── index.ts
│       │
│       └── utils/
│           └── index.ts
│
└── k8s/                            # Kubernetes manifests
    ├── namespace.yaml
    ├── configmap.yaml
    ├── secrets.yaml
    │
    ├── postgres/
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   └── pvc.yaml
    │
    ├── redis/
    │   ├── deployment.yaml
    │   └── service.yaml
    │
    ├── api/
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   └── ingress.yaml
    │
    ├── worker/
    │   ├── deployment.yaml
    │   └── keda-scaledobject.yaml  # KEDA autoscaler
    │
    └── frontend/
        ├── deployment.yaml
        ├── service.yaml
        └── ingress.yaml
```

---

## Architecture Pattern Explained

### Controller → Service → Repository

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HTTP Request                                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ROUTES (routes/*.ts)                                               │
│  - Define URL patterns                                              │
│  - Attach middleware                                                │
│  - Delegate to controllers                                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CONTROLLERS (controllers/*.ts)                                     │
│  - Parse request (params, body, query)                              │
│  - Call service methods                                             │
│  - Format HTTP response                                             │
│  - Handle HTTP-specific errors                                      │
│  - NO business logic here                                           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SERVICES (services/*.ts)                                           │
│  - Business logic lives here                                        │
│  - Orchestrates multiple repositories                               │
│  - Handles transactions                                             │
│  - Framework-agnostic (can be reused in CLI, tests, etc.)           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  REPOSITORIES (repositories/*.ts)                                   │
│  - Data access only                                                 │
│  - Prisma queries                                                   │
│  - No business logic                                                │
│  - Single responsibility: talk to database                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          PostgreSQL                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Why This Pattern?

| Layer | Responsibility | Testability |
|-------|---------------|-------------|
| **Routes** | URL mapping, middleware chain | Integration tests |
| **Controllers** | HTTP request/response handling | Mock services |
| **Services** | Business logic, orchestration | Unit tests with mocked repos |
| **Repositories** | Database queries | Unit tests with test DB |

### Example Flow: User Submits Code

```typescript
// 1. ROUTE - defines the endpoint
router.post('/', authMiddleware, validate(submitCodeSchema), submissionController.submit);

// 2. CONTROLLER - handles HTTP
async submit(req: Request, res: Response, next: NextFunction) {
  const { problemId, language, code } = req.body;
  const userId = req.user.id;
  
  const result = await submissionService.createSubmission({ userId, problemId, language, code });
  
  res.status(202).json({ submissionId: result.id, message: 'Submission queued' });
}

// 3. SERVICE - business logic
async createSubmission(data: CreateSubmissionDTO): Promise<Submission> {
  const problem = await problemRepository.findById(data.problemId);
  if (!problem) throw new NotFoundError('Problem not found');
  
  const submission = await submissionRepository.create({
    ...data,
    status: 'PENDING',
  });
  
  await queueService.addExecutionJob({
    submissionId: submission.id,
    code: data.code,
    language: data.language,
    testCases: problem.testCases,
    limits: { timeMs: problem.timeLimitMs, memoryMb: problem.memoryLimitMb },
  });
  
  return submission;
}

// 4. REPOSITORY - database access
async create(data: Prisma.SubmissionCreateInput): Promise<Submission> {
  return this.prisma.submission.create({ data });
}
```

---

## Phase 0 — Environment Setup & Project Scaffold

**Goal:** Full TypeScript monorepo structure with proper tooling configured.

### Milestone 0.1 — Verify Prerequisites

**What:** Ensure all required tools are installed on your machine.

**Steps:**
1. Check Node.js version (need 20+):
   ```bash
   node --version   # Should be v20.x or higher
   ```
2. Check pnpm (recommended) or npm:
   ```bash
   pnpm --version   # Or: npm --version
   ```
3. Check Docker is running:
   ```bash
   docker --version
   docker ps
   ```
4. Check Docker Compose:
   ```bash
   docker compose version   # Note: v2 syntax (no hyphen)
   ```
5. Check Git:
   ```bash
   git --version
   ```

**Success Criteria:** All commands return version numbers without errors.

---

### Milestone 0.2 — Create Project Structure

**What:** Set up the complete TypeScript monorepo folder structure.

**Steps:**
```bash
# Create the complete directory structure
mkdir -p api/src/{config,types,routes,controllers,services,repositories,middleware,validators,websocket,utils}
mkdir -p api/prisma/migrations

mkdir -p worker/src/{config,types,processors,executor,sandbox,grader,services,utils}

mkdir -p shared/src/{types,constants,utils}

mkdir -p frontend/src/{api,hooks,context,components/{ui,layout,editor,problem},pages,types,utils}

mkdir -p sandbox-images/{python3,java}

mkdir -p k8s/{postgres,redis,api,worker,frontend}
```

**Success Criteria:** Running `tree -d` shows the complete structure.

---

### Milestone 0.3 — Initialize TypeScript Projects

**What:** Set up `package.json` and `tsconfig.json` for all services.

**API package.json:**
```bash
cd api
npm init -y
```

**Edit `api/package.json`:**
```json
{
  "name": "codeex-api",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@prisma/client": "^5.10.0",
    "bcryptjs": "^2.4.3",
    "bullmq": "^5.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "socket.io": "^4.7.4",
    "uuid": "^9.0.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.11.0",
    "@types/uuid": "^9.0.7",
    "prisma": "^5.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

**API tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": "./src",
    "paths": {
      "@config/*": ["config/*"],
      "@types/*": ["types/*"],
      "@routes/*": ["routes/*"],
      "@controllers/*": ["controllers/*"],
      "@services/*": ["services/*"],
      "@repositories/*": ["repositories/*"],
      "@middleware/*": ["middleware/*"],
      "@validators/*": ["validators/*"],
      "@utils/*": ["utils/*"]
    }
  },
  "include": ["src/**/*", "prisma/seed.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Worker package.json:**
```json
{
  "name": "codeex-worker",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@prisma/client": "^5.10.0",
    "bullmq": "^5.1.0",
    "dockerode": "^4.0.2",
    "dotenv": "^16.4.0",
    "ioredis": "^5.3.2",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/dockerode": "^3.3.23",
    "@types/node": "^20.11.0",
    "@types/uuid": "^9.0.7",
    "prisma": "^5.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

**Worker tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "baseUrl": "./src",
    "paths": {
      "@config/*": ["config/*"],
      "@types/*": ["types/*"],
      "@executor/*": ["executor/*"],
      "@grader/*": ["grader/*"],
      "@services/*": ["services/*"],
      "@utils/*": ["utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Install dependencies:**
```bash
cd api && npm install && cd ..
cd worker && npm install && cd ..
```

**Success Criteria:** 
- `npm run type-check` passes in both directories
- `npm run dev` starts without TypeScript errors

---

### Milestone 0.4 — Create Docker Compose (Development)

**What:** Docker Compose for local development with PostgreSQL and Redis.

**File: `docker-compose.yml`**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: codeex-postgres
    environment:
      POSTGRES_USER: codeex
      POSTGRES_PASSWORD: codeex123
      POSTGRES_DB: codeex
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U codeex"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: codeex-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Optional: Redis Commander for queue inspection
  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: codeex-redis-commander
    environment:
      REDIS_HOSTS: local:redis:6379
    ports:
      - "8081:8081"
    depends_on:
      - redis

volumes:
  postgres_data:
  redis_data:
```

**Start services:**
```bash
docker compose up -d
docker compose ps   # Verify healthy status
```

**Success Criteria:** `docker compose ps` shows postgres and redis as "healthy".

---

### Milestone 0.5 — Environment Configuration (Type-Safe)

**What:** Create typed environment configuration.

**File: `.env.example` (root)**
```env
# Database
DATABASE_URL="postgresql://codeex:codeex123@localhost:5432/codeex"

# Redis
REDIS_URL="redis://localhost:6379"

# API Server
PORT=8080
NODE_ENV=development

# JWT
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Docker (Worker)
DOCKER_SOCKET_PATH="/var/run/docker.sock"
```

**Copy to actual env files:**
```bash
cp .env.example api/.env
cp .env.example worker/.env
```

**File: `api/src/config/env.ts`**
```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('8080'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

**File: `.gitignore` (root)**
```gitignore
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Prisma
api/prisma/migrations/*_migration_lock.toml

# Temp files
tmp/
temp/
```

**Success Criteria:**
- Environment files exist and are git-ignored
- `api/src/config/env.ts` compiles without errors

---

### Milestone 0.6 — Git Repository Initialization

**What:** Initialize Git with proper commit.

**Steps:**
```bash
git init
git add .
git commit -m "chore: initial project scaffold with TypeScript config"
```

**Success Criteria:** Clean git status after commit.

---

## Phase 0 Checkpoint

Verification commands:
```bash
# Services running
docker compose ps

# TypeScript compiles
cd api && npm run type-check && cd ..
cd worker && npm run type-check && cd ..

# Environment loaded
cat api/.env | head -3

# Git clean
git status
```

---

## Phase 1 — Database Layer

**Goal:** Full schema exists in PostgreSQL. Seed data is inserted. Prisma Client works.

### Milestone 1.1 — Install Prisma

**What:** Add Prisma ORM to the API project.

**Steps:**
1. Navigate to API directory:
   ```bash
   cd api
   ```
2. Install Prisma:
   ```bash
   npm install prisma @prisma/client
   ```
3. Initialize Prisma:
   ```bash
   npx prisma init
   ```

**Success Criteria:** `api/prisma/schema.prisma` file is created.

---

### Milestone 1.2 — Define Database Schema

**What:** Write the complete data model for our application.

**File: `api/prisma/schema.prisma`**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String       @id @default(uuid())
  username     String       @unique
  email        String       @unique
  passwordHash String       @map("password_hash")
  createdAt    DateTime     @default(now()) @map("created_at")
  submissions  Submission[]

  @@map("users")
}

model Problem {
  id           String       @id @default(uuid())
  title        String
  description  String
  difficulty   Difficulty   @default(EASY)
  timeLimitMs  Int          @default(2000) @map("time_limit_ms")
  memoryLimitMb Int         @default(256) @map("memory_limit_mb")
  createdAt    DateTime     @default(now()) @map("created_at")
  testCases    TestCase[]
  submissions  Submission[]

  @@map("problems")
}

model TestCase {
  id             String   @id @default(uuid())
  problemId      String   @map("problem_id")
  input          String
  expectedOutput String   @map("expected_output")
  isSample       Boolean  @default(false) @map("is_sample")
  problem        Problem  @relation(fields: [problemId], references: [id], onDelete: Cascade)

  @@map("test_cases")
}

model Submission {
  id              String           @id @default(uuid())
  userId          String           @map("user_id")
  problemId       String           @map("problem_id")
  language        Language
  code            String
  status          SubmissionStatus @default(PENDING)
  verdict         Verdict?
  executionTimeMs Int?             @map("execution_time_ms")
  memoryUsedMb    Int?             @map("memory_used_mb")
  stdout          String?
  stderr          String?
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  user            User             @relation(fields: [userId], references: [id])
  problem         Problem          @relation(fields: [problemId], references: [id])

  @@map("submissions")
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum Language {
  PYTHON3
  JAVA
}

enum SubmissionStatus {
  PENDING
  EXECUTING
  COMPLETED
}

enum Verdict {
  ACCEPTED
  WRONG_ANSWER
  TIME_LIMIT_EXCEEDED
  MEMORY_LIMIT_EXCEEDED
  RUNTIME_ERROR
  COMPILATION_ERROR
}
```

**Schema Explained:**
- **User** — registered users with hashed passwords
- **Problem** — coding challenges with time/memory limits
- **TestCase** — input/output pairs for each problem (some are samples shown to user)
- **Submission** — user's code submission with status tracking

**Success Criteria:** Schema file is valid (no syntax errors).

---

### Milestone 1.3 — Run Database Migration

**What:** Apply the schema to PostgreSQL, creating all tables.

**Steps:**
1. Ensure Docker Compose is running:
   ```bash
   docker-compose up -d
   ```
2. Run the migration:
   ```bash
   cd api
   npx prisma migrate dev --name init
   ```

**What Happens:**
- Prisma connects to PostgreSQL
- Creates a `_prisma_migrations` table to track migrations
- Creates all tables: `users`, `problems`, `test_cases`, `submissions`
- Generates Prisma Client in `node_modules/@prisma/client`

**Success Criteria:** Migration succeeds. You can connect to PostgreSQL and see the tables.

---

### Milestone 1.4 — Create Seed Script (TypeScript)

**What:** Write a typed script to insert sample data for testing.

**File: `api/prisma/seed.ts`**
```typescript
import { PrismaClient, Difficulty } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Clear existing data (in correct order due to foreign keys)
  await prisma.submission.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.user.deleteMany();

  // Seed Problem 1: Two Sum
  const twoSum = await prisma.problem.create({
    data: {
      title: 'Two Sum',
      description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

## Example
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

## Input Format
- First line: space-separated integers (the array)
- Second line: the target integer

## Output Format
- Two space-separated indices (0-indexed)`,
      difficulty: Difficulty.EASY,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      testCases: {
        create: [
          { input: '2 7 11 15\n9', expectedOutput: '0 1', isSample: true },
          { input: '3 2 4\n6', expectedOutput: '1 2', isSample: true },
          { input: '3 3\n6', expectedOutput: '0 1', isSample: false },
          { input: '1 5 3 7 2\n9', expectedOutput: '1 3', isSample: false },
        ],
      },
    },
  });

  // Seed Problem 2: FizzBuzz
  const fizzBuzz = await prisma.problem.create({
    data: {
      title: 'FizzBuzz',
      description: `Write a program that prints the numbers from 1 to n. But for multiples of three, print "Fizz" instead of the number, and for multiples of five, print "Buzz". For numbers which are multiples of both three and five, print "FizzBuzz".

## Example
\`\`\`
Input: 15
Output:
1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz
\`\`\`

## Input Format
- A single integer n (1 <= n <= 100)

## Output Format
- Print each number or word on a new line`,
      difficulty: Difficulty.EASY,
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      testCases: {
        create: [
          { input: '5', expectedOutput: '1\n2\nFizz\n4\nBuzz', isSample: true },
          { input: '15', expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', isSample: false },
          { input: '3', expectedOutput: '1\n2\nFizz', isSample: false },
        ],
      },
    },
  });

  // Seed Problem 3: Reverse String (Medium)
  const reverseString = await prisma.problem.create({
    data: {
      title: 'Reverse Words in a String',
      description: `Given an input string s, reverse the order of the words.

A word is defined as a sequence of non-space characters. The words in s will be separated by at least one space.

Return a string of the words in reverse order concatenated by a single space.

## Example
\`\`\`
Input: "the sky is blue"
Output: "blue is sky the"
\`\`\`

## Input Format
- A single line containing the string

## Output Format
- The reversed string`,
      difficulty: Difficulty.MEDIUM,
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      testCases: {
        create: [
          { input: 'the sky is blue', expectedOutput: 'blue is sky the', isSample: true },
          { input: 'hello world', expectedOutput: 'world hello', isSample: true },
          { input: 'a', expectedOutput: 'a', isSample: false },
        ],
      },
    },
  });

  console.log('Seeded problems:');
  console.log(`  - ${twoSum.title} (${twoSum.id})`);
  console.log(`  - ${fizzBuzz.title} (${fizzBuzz.id})`);
  console.log(`  - ${reverseString.title} (${reverseString.id})`);
  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Update `api/package.json`** (add prisma seed config):
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Run the seed:**
```bash
cd api
npx prisma db seed
```

**Success Criteria:** Console shows all three seeded problems with their UUIDs.

---

### Milestone 1.5 — Create Database Client Singleton

**What:** Create a properly typed, singleton Prisma client.

**File: `api/src/config/database.ts`**
```typescript
import { PrismaClient } from '@prisma/client';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
```

**Why the global pattern?** In development with hot-reloading (tsx watch), each reload creates a new PrismaClient instance. The global pattern ensures we reuse the same connection pool.

**Success Criteria:** File compiles without errors.

---

## Phase 1 Checkpoint

Verify Phase 1 is complete:
```bash
# Connect to PostgreSQL and check tables
docker exec -it codeex-postgres psql -U codeex -d codeex -c "\dt"

# Should show:
#  Schema |       Name        | Type  | Owner
# --------+-------------------+-------+--------
#  public | _prisma_migrations| table | codeex
#  public | problems          | table | codeex
#  public | submissions       | table | codeex
#  public | test_cases        | table | codeex
#  public | users             | table | codeex

# Check seed data
docker exec -it codeex-postgres psql -U codeex -d codeex -c "SELECT title FROM problems;"

# Should show: Two Sum
```

---

## Phase 2 — API Server Core

**Goal:** Express server with TypeScript, proper layered architecture, and type-safe request handling.

### Milestone 2.1 — Dependencies Already Installed

Dependencies were already defined in `package.json` during Phase 0. Run install if you haven't:

```bash
cd api
npm install
```

---

### Milestone 2.2 — Create Utility Modules

**What:** Set up error classes and response helpers.

**File: `api/src/utils/errors.ts`**
```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}
```

**File: `api/src/utils/response.ts`**
```typescript
import { Response } from 'express';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  res.status(statusCode).json(response);
}

export function sendError(res: Response, message: string, statusCode: number = 500, code?: string): void {
  const response: ApiResponse<null> = {
    success: false,
    error: message,
    code,
  };
  res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

export function sendAccepted<T>(res: Response, data: T): void {
  sendSuccess(res, data, 202);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
```

**File: `api/src/utils/logger.ts`**
```typescript
import { env } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = env.NODE_ENV === 'production' ? 'info' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, meta?: object): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug: (message: string, meta?: object) => {
    if (shouldLog('debug')) console.debug(formatMessage('debug', message, meta));
  },
  info: (message: string, meta?: object) => {
    if (shouldLog('info')) console.info(formatMessage('info', message, meta));
  },
  warn: (message: string, meta?: object) => {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message, meta));
  },
  error: (message: string, meta?: object) => {
    if (shouldLog('error')) console.error(formatMessage('error', message, meta));
  },
};
```

---

### Milestone 2.3 — Create Type Definitions

**What:** Define shared types used across the API.

**File: `api/src/types/index.ts`**
```typescript
import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

**File: `api/src/types/submission.types.ts`**
```typescript
import { Language, Verdict, SubmissionStatus } from '@prisma/client';

export interface CreateSubmissionDTO {
  userId: string;
  problemId: string;
  language: Language;
  code: string;
}

export interface SubmissionJobPayload {
  submissionId: string;
  userId: string;
  problemId: string;
  language: Language;
  code: string;
  testCases: TestCasePayload[];
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface TestCasePayload {
  id: string;
  input: string;
  expectedOutput: string;
}

export interface SubmissionResult {
  submissionId: string;
  status: SubmissionStatus;
  verdict: Verdict;
  executionTimeMs: number;
  passedCount: number;
  totalCount: number;
}
```

---

### Milestone 2.4 — Create Middleware

**What:** Auth, validation, and error handling middleware.

**File: `api/src/middleware/auth.middleware.ts`**
```typescript
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';
import { AuthenticatedRequest, JwtPayload } from '../types';

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
```

**File: `api/src/middleware/validate.middleware.ts`**
```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        throw new BadRequestError(messages.join(', '));
      }
      throw error;
    }
  };
}
```

**File: `api/src/middleware/error.middleware.ts`**
```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error(err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code);
    return;
  }

  const message = env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  sendError(res, message, 500, 'INTERNAL_ERROR');
}
```

**File: `api/src/middleware/logger.middleware.ts`**
```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}
```

---

### Milestone 2.5 — Create Express App

**What:** Configure Express with middleware and routes.

**File: `api/src/app.ts`**
```typescript
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { loggerMiddleware } from './middleware/logger.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import routes from './routes';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(loggerMiddleware);

  // Health check (outside /api for load balancer)
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API routes
  app.use('/api', routes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      code: 'NOT_FOUND',
    });
  });

  // Error handler (must be last)
  app.use(errorMiddleware);

  return app;
}
```

**File: `api/src/server.ts`**
```typescript
import http from 'http';
import { Application } from 'express';
import { Server as SocketServer } from 'socket.io';
import { setupWebSocket } from './websocket';
import { logger } from './utils/logger';

export function createServer(app: Application): http.Server {
  const server = http.createServer(app);
  return server;
}

export async function startServer(
  server: http.Server,
  port: number
): Promise<SocketServer> {
  const io = await setupWebSocket(server);

  return new Promise((resolve) => {
    server.listen(port, () => {
      logger.info(`API Server running on port ${port}`);
      logger.info(`WebSocket server ready`);
      resolve(io);
    });
  });
}
```

**File: `api/src/index.ts`**
```typescript
import { env } from './config/env';
import { createApp } from './app';
import { createServer, startServer } from './server';
import { prisma } from './config/database';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected');

    // Create and start server
    const app = createApp();
    const server = createServer(app);
    await startServer(server, env.PORT);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(() => {
        logger.info('HTTP server closed');
      });
      await prisma.$disconnect();
      logger.info('Database disconnected');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

main();
```

---

### Milestone 2.6 — Create Route Structure

**What:** Set up route aggregator and placeholder routes.

**File: `api/src/routes/index.ts`**
```typescript
import { Router } from 'express';
import authRoutes from './auth.routes';
import problemRoutes from './problem.routes';
import submissionRoutes from './submission.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/problems', problemRoutes);
router.use('/submissions', submissionRoutes);

export default router;
```

**File: `api/src/routes/auth.routes.ts`**
```typescript
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';

const router = Router();
const authController = new AuthController();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

export default router;
```

**File: `api/src/routes/problem.routes.ts`**
```typescript
import { Router } from 'express';
import { ProblemController } from '../controllers/problem.controller';

const router = Router();
const problemController = new ProblemController();

router.get('/', problemController.getAll);
router.get('/:id', problemController.getById);

export default router;
```

**File: `api/src/routes/submission.routes.ts`**
```typescript
import { Router } from 'express';
import { SubmissionController } from '../controllers/submission.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createSubmissionSchema } from '../validators/submission.validator';

const router = Router();
const submissionController = new SubmissionController();

router.use(authMiddleware as any); // All submission routes require auth

router.post('/', validate(createSubmissionSchema), submissionController.create);
router.get('/', submissionController.getAll);
router.get('/:id', submissionController.getById);

export default router;
```

**Success Criteria:** `npm run dev` starts without TypeScript errors.

---

### Milestone 2.7 — Create Validators (Zod Schemas)

**What:** Type-safe request validation with Zod.

**File: `api/src/validators/auth.validator.ts`**
```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, {
      message: 'Username can only contain letters, numbers, and underscores',
    }),
    email: z.string().email(),
    password: z.string().min(8).max(100),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
```

**File: `api/src/validators/submission.validator.ts`**
```typescript
import { z } from 'zod';
import { Language } from '@prisma/client';

export const createSubmissionSchema = z.object({
  body: z.object({
    problemId: z.string().uuid(),
    language: z.nativeEnum(Language),
    code: z.string().min(1).max(50000),
  }),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>['body'];
```

---

### Milestone 2.8 — Create Repositories (Data Access Layer)

**What:** Isolated database queries, single responsibility.

**File: `api/src/repositories/user.repository.ts`**
```typescript
import { Prisma, User } from '@prisma/client';
import { prisma } from '../config/database';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { username } });
  }

  async findByEmailOrUsername(email: string, username: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }
}

export const userRepository = new UserRepository();
```

**File: `api/src/repositories/problem.repository.ts`**
```typescript
import { Problem, TestCase } from '@prisma/client';
import { prisma } from '../config/database';

export type ProblemWithTestCases = Problem & { testCases: TestCase[] };
export type ProblemWithSampleTestCases = Problem & { testCases: Pick<TestCase, 'id' | 'input' | 'expectedOutput'>[] };

export class ProblemRepository {
  async findAll(): Promise<Pick<Problem, 'id' | 'title' | 'difficulty' | 'createdAt'>[]> {
    return prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        difficulty: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Problem | null> {
    return prisma.problem.findUnique({ where: { id } });
  }

  async findByIdWithSampleTestCases(id: string): Promise<ProblemWithSampleTestCases | null> {
    return prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: {
          where: { isSample: true },
          select: {
            id: true,
            input: true,
            expectedOutput: true,
          },
        },
      },
    });
  }

  async findByIdWithAllTestCases(id: string): Promise<ProblemWithTestCases | null> {
    return prisma.problem.findUnique({
      where: { id },
      include: { testCases: true },
    });
  }
}

export const problemRepository = new ProblemRepository();
```

**File: `api/src/repositories/submission.repository.ts`**
```typescript
import { Prisma, Submission, SubmissionStatus, Verdict } from '@prisma/client';
import { prisma } from '../config/database';

export class SubmissionRepository {
  async findById(id: string): Promise<Submission | null> {
    return prisma.submission.findUnique({ where: { id } });
  }

  async findByIdWithProblem(id: string) {
    return prisma.submission.findUnique({
      where: { id },
      include: {
        problem: { select: { title: true } },
      },
    });
  }

  async findByUserId(userId: string, limit: number = 50) {
    return prisma.submission.findMany({
      where: { userId },
      include: {
        problem: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async create(data: Prisma.SubmissionUncheckedCreateInput): Promise<Submission> {
    return prisma.submission.create({ data });
  }

  async updateStatus(id: string, status: SubmissionStatus): Promise<Submission> {
    return prisma.submission.update({
      where: { id },
      data: { status },
    });
  }

  async updateResult(
    id: string,
    data: {
      status: SubmissionStatus;
      verdict: Verdict;
      executionTimeMs?: number;
      memoryUsedMb?: number;
      stdout?: string;
      stderr?: string;
    }
  ): Promise<Submission> {
    return prisma.submission.update({
      where: { id },
      data,
    });
  }
}

export const submissionRepository = new SubmissionRepository();
```

---

### Milestone 2.9 — Create Services (Business Logic)

**What:** Core business logic, framework-agnostic.

**File: `api/src/services/auth.service.ts`**
```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { env } from '../config/env';
import { userRepository } from '../repositories/user.repository';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { JwtPayload } from '../types';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

export interface AuthResult {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    const { username, email, password } = input;

    const existingUser = await userRepository.findByEmailOrUsername(email, username);
    if (existingUser) {
      throw new ConflictError('User with this email or username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await userRepository.create({
      username,
      email,
      passwordHash,
    });

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const { email, password } = input;

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });
  }
}

export const authService = new AuthService();
```

**File: `api/src/services/problem.service.ts`**
```typescript
import { problemRepository, ProblemWithSampleTestCases } from '../repositories/problem.repository';
import { NotFoundError } from '../utils/errors';

export class ProblemService {
  async getAllProblems() {
    return problemRepository.findAll();
  }

  async getProblemById(id: string): Promise<ProblemWithSampleTestCases> {
    const problem = await problemRepository.findByIdWithSampleTestCases(id);
    if (!problem) {
      throw new NotFoundError('Problem not found');
    }
    return problem;
  }
}

export const problemService = new ProblemService();
```

**File: `api/src/services/submission.service.ts`**
```typescript
import { Submission } from '@prisma/client';
import { submissionRepository } from '../repositories/submission.repository';
import { problemRepository } from '../repositories/problem.repository';
import { queueService } from './queue.service';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { CreateSubmissionInput } from '../validators/submission.validator';
import { SubmissionJobPayload } from '../types/submission.types';

export class SubmissionService {
  async createSubmission(
    userId: string,
    input: CreateSubmissionInput
  ): Promise<{ submissionId: string; jobId: string }> {
    const { problemId, language, code } = input;

    const problem = await problemRepository.findByIdWithAllTestCases(problemId);
    if (!problem) {
      throw new NotFoundError('Problem not found');
    }

    const submission = await submissionRepository.create({
      userId,
      problemId,
      language,
      code,
      status: 'PENDING',
    });

    const jobPayload: SubmissionJobPayload = {
      submissionId: submission.id,
      userId,
      problemId,
      language,
      code,
      testCases: problem.testCases.map((tc) => ({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      })),
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
    };

    const jobId = await queueService.addExecutionJob(jobPayload);

    return { submissionId: submission.id, jobId };
  }

  async getSubmissionById(userId: string, submissionId: string) {
    const submission = await submissionRepository.findByIdWithProblem(submissionId);
    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    if (submission.userId !== userId) {
      throw new ForbiddenError('You do not have access to this submission');
    }

    return submission;
  }

  async getUserSubmissions(userId: string) {
    return submissionRepository.findByUserId(userId);
  }
}

export const submissionService = new SubmissionService();
```

**File: `api/src/services/queue.service.ts`**
```typescript
import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { SubmissionJobPayload } from '../types/submission.types';

const QUEUE_NAME = 'code-execution';

export class QueueService {
  private queue: Queue;

  constructor() {
    this.queue = new Queue(QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
  }

  async addExecutionJob(payload: SubmissionJobPayload): Promise<string> {
    const job = await this.queue.add('execute', payload);
    return job.id || 'unknown';
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}

export const queueService = new QueueService();
```

**File: `api/src/config/redis.ts`**
```typescript
import IORedis from 'ioredis';
import { env } from './env';

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});
```

---

### Milestone 2.10 — Create Controllers (HTTP Handlers)

**What:** Thin layer that handles HTTP, delegates to services.

**File: `api/src/controllers/auth.controller.ts`**
```typescript
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: RegisterInput = req.body;
      const result = await authService.register(input);
      sendCreated(res, result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: LoginInput = req.body;
      const result = await authService.login(input);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}
```

**File: `api/src/controllers/problem.controller.ts`**
```typescript
import { Request, Response, NextFunction } from 'express';
import { problemService } from '../services/problem.service';
import { sendSuccess } from '../utils/response';

export class ProblemController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const problems = await problemService.getAllProblems();
      sendSuccess(res, problems);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const problem = await problemService.getProblemById(id);
      sendSuccess(res, problem);
    } catch (error) {
      next(error);
    }
  }
}
```

**File: `api/src/controllers/submission.controller.ts`**
```typescript
import { Response, NextFunction } from 'express';
import { submissionService } from '../services/submission.service';
import { sendSuccess, sendAccepted } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { CreateSubmissionInput } from '../validators/submission.validator';

export class SubmissionController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.userId;
      const input: CreateSubmissionInput = req.body;
      const result = await submissionService.createSubmission(userId, input);
      sendAccepted(res, {
        message: 'Submission queued for execution',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const submission = await submissionService.getSubmissionById(userId, id);
      sendSuccess(res, submission);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.userId;
      const submissions = await submissionService.getUserSubmissions(userId);
      sendSuccess(res, submissions);
    } catch (error) {
      next(error);
    }
  }
}
```

---

## Phase 2 Checkpoint

Test the complete API:
```bash
# 1. Start services
docker compose up -d
cd api && npm run dev

# 2. Health check
curl http://localhost:8080/health

# 3. Register a user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123456"}'

# Save the token from the response, e.g.:
# TOKEN="eyJhbGciOiJIUzI1..."

# 4. List problems
curl http://localhost:8080/api/problems

# 5. Get problem details (replace <problem-id>)
curl http://localhost:8080/api/problems/<problem-id>

# 6. Submit code (replace <token> and <problem-id>)
curl -X POST http://localhost:8080/api/submissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "problemId": "<problem-id>",
    "language": "PYTHON3",
    "code": "nums = list(map(int, input().split()))\ntarget = int(input())\nfor i in range(len(nums)):\n    for j in range(i+1, len(nums)):\n        if nums[i] + nums[j] == target:\n            print(i, j)\n            break"
  }'

# Should return 202 with submissionId
```

**All Phase 2 files created:**
```
api/src/
├── index.ts                    # Entry point
├── app.ts                      # Express app
├── server.ts                   # HTTP + WS server
├── config/
│   ├── env.ts                  # Environment validation
│   ├── database.ts             # Prisma client
│   └── redis.ts                # Redis client
├── types/
│   ├── index.ts                # Shared types
│   └── submission.types.ts     # Submission types
├── routes/
│   ├── index.ts                # Route aggregator
│   ├── auth.routes.ts
│   ├── problem.routes.ts
│   └── submission.routes.ts
├── controllers/
│   ├── auth.controller.ts
│   ├── problem.controller.ts
│   └── submission.controller.ts
├── services/
│   ├── auth.service.ts
│   ├── problem.service.ts
│   ├── submission.service.ts
│   └── queue.service.ts
├── repositories/
│   ├── user.repository.ts
│   ├── problem.repository.ts
│   └── submission.repository.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── validate.middleware.ts
│   ├── error.middleware.ts
│   └── logger.middleware.ts
├── validators/
│   ├── auth.validator.ts
│   └── submission.validator.ts
└── utils/
    ├── errors.ts
    ├── response.ts
    └── logger.ts
```

---

## Phase 3 — Sandbox Docker Images

**Goal:** Custom Docker images for Python 3 and Java that can safely execute user code.

### Milestone 3.1 — Python 3 Sandbox Image

**What:** Minimal Python image with no network capabilities.

**File: `sandbox-images/python3/Dockerfile`**
```dockerfile
FROM python:3.11-alpine

# Create non-root user
RUN adduser -D -u 1000 sandbox

# Set working directory
WORKDIR /app

# Switch to non-root user
USER sandbox

# Default command (will be overridden)
CMD ["python3", "solution.py"]
```

**Build the image:**
```bash
cd sandbox-images/python3
docker build -t codeex-python3:latest .
```

**Success Criteria:** `docker images | grep codeex-python3` shows the image.

---

### Milestone 3.2 — Java Sandbox Image

**What:** JDK image that can compile and run Java code.

**File: `sandbox-images/java/Dockerfile`**
```dockerfile
FROM eclipse-temurin:17-jdk-alpine

# Create non-root user
RUN adduser -D -u 1000 sandbox

# Set working directory
WORKDIR /app

# Switch to non-root user
USER sandbox

# Default command (will be overridden)
CMD ["sh", "-c", "javac Solution.java && java Solution"]
```

**Build the image:**
```bash
cd sandbox-images/java
docker build -t codeex-java:latest .
```

**Success Criteria:** `docker images | grep codeex-java` shows the image.

---

### Milestone 3.3 — Test Images Manually

**What:** Verify images can execute code correctly.

**Test Python:**
```bash
# Create a test file
echo 'print("Hello, World!")' > /tmp/solution.py

# Run in container
docker run --rm \
  --network none \
  --memory 256m \
  --cpus 0.5 \
  -v /tmp/solution.py:/app/solution.py:ro \
  codeex-python3:latest

# Should print: Hello, World!
```

**Test Java:**
```bash
# Create a test file
echo 'public class Solution { public static void main(String[] args) { System.out.println("Hello, World!"); } }' > /tmp/Solution.java

# Run in container
docker run --rm \
  --network none \
  --memory 256m \
  --cpus 0.5 \
  -v /tmp/Solution.java:/app/Solution.java:ro \
  codeex-java:latest

# Should print: Hello, World!
```

**Success Criteria:** Both containers print "Hello, World!" and exit.

---

## Phase 3 Checkpoint

```bash
docker images | grep codeex
# Should show:
# codeex-python3   latest   ...
# codeex-java      latest   ...
```

---

## Phase 4 — Execution Worker (TypeScript)

**Goal:** Worker service that pulls jobs from queue, executes code in Docker, and grades output.

### Milestone 4.1 — Setup Worker Project

**What:** Configure TypeScript worker with dependencies.

Dependencies were defined in `package.json` during Phase 0. Install and set up Prisma:

```bash
cd worker
npm install

# Copy Prisma schema from API and generate client
cp -r ../api/prisma ./prisma
npx prisma generate
```

**Success Criteria:** `npm run type-check` passes.

---

### Milestone 4.2 — Create Worker Configuration

**What:** Set up typed configuration for the worker.

**File: `worker/src/config/env.ts`**
```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  DOCKER_SOCKET_PATH: z.string().default('/var/run/docker.sock'),
  WORKER_CONCURRENCY: z.string().transform(Number).default('2'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

**File: `worker/src/config/database.ts`**
```typescript
import { PrismaClient } from '@prisma/client';
import { env } from './env';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
```

**File: `worker/src/config/redis.ts`**
```typescript
import IORedis from 'ioredis';
import { env } from './env';

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const publisher = new IORedis(env.REDIS_URL);
```

**File: `worker/src/config/docker.ts`**
```typescript
import Docker from 'dockerode';
import { env } from './env';

export const docker = new Docker({
  socketPath: env.DOCKER_SOCKET_PATH,
});
```

---

### Milestone 4.3 — Create Type Definitions

**What:** Define types for job payloads and execution results.

**File: `worker/src/types/job.types.ts`**
```typescript
import { Language } from '@prisma/client';

export interface ExecutionJobPayload {
  submissionId: string;
  userId: string;
  problemId: string;
  language: Language;
  code: string;
  testCases: TestCasePayload[];
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface TestCasePayload {
  id: string;
  input: string;
  expectedOutput: string;
}
```

**File: `worker/src/types/execution.types.ts`**
```typescript
import { Verdict } from '@prisma/client';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  timedOut: boolean;
  compilationError: boolean;
}

export interface TestCaseResult extends ExecutionResult {
  testCaseId: string;
  passed: boolean;
}

export interface SubmissionResult {
  submissionId: string;
  status: 'COMPLETED';
  verdict: Verdict;
  executionTimeMs: number;
  passedCount: number;
  totalCount: number;
}

export interface LanguageConfig {
  image: string;
  fileName: string;
  compileCmd: string[] | null;
  runCmd: string[];
}
```

---

### Milestone 4.4 — Create Sandbox Container Manager

**What:** Module that manages Docker container lifecycle.

**File: `worker/src/sandbox/container.ts`**
```typescript
import Docker, { Container } from 'dockerode';
import { docker } from '../config/docker';

interface ContainerOptions {
  image: string;
  cmd: string[];
  binds: string[];
  memoryMb: number;
  timeoutMs: number;
  workingDir?: string;
}

interface ContainerResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export async function runContainer(options: ContainerOptions): Promise<ContainerResult> {
  const { image, cmd, binds, memoryMb, timeoutMs, workingDir = '/app' } = options;

  let container: Container | null = null;
  let timeoutHandle: NodeJS.Timeout | null = null;
  let timedOut = false;

  try {
    container = await docker.createContainer({
      Image: image,
      Cmd: cmd,
      WorkingDir: workingDir,
      User: '1000:1000',
      HostConfig: {
        Binds: binds,
        Memory: memoryMb * 1024 * 1024,
        MemorySwap: memoryMb * 1024 * 1024,
        CpuPeriod: 100000,
        CpuQuota: 50000,
        NetworkMode: 'none',
        PidsLimit: 50,
        ReadonlyRootfs: false,
      },
      AttachStdout: true,
      AttachStderr: true,
    });

    timeoutHandle = setTimeout(async () => {
      timedOut = true;
      try {
        if (container) await container.kill();
      } catch {
        // Container might have already finished
      }
    }, timeoutMs);

    await container.start();
    const waitResult = await container.wait();

    if (timeoutHandle) clearTimeout(timeoutHandle);

    const logs = await container.logs({ stdout: true, stderr: true });
    const output = parseDockerLogs(logs as Buffer);

    return {
      stdout: output.stdout,
      stderr: output.stderr,
      exitCode: waitResult.StatusCode,
      timedOut,
    };
  } catch (error) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    return {
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Unknown error',
      exitCode: 1,
      timedOut,
    };
  } finally {
    if (container) {
      try {
        await container.remove({ force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

function parseDockerLogs(buffer: Buffer): { stdout: string; stderr: string } {
  let stdout = '';
  let stderr = '';
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) break;

    const streamType = buffer[offset];
    const size = buffer.readUInt32BE(offset + 4);

    if (offset + 8 + size > buffer.length) break;

    const data = buffer.slice(offset + 8, offset + 8 + size).toString('utf8');

    if (streamType === 1) stdout += data;
    else if (streamType === 2) stderr += data;

    offset += 8 + size;
  }

  return { stdout, stderr };
}
```

---

### Milestone 4.5 — Create Executor

**What:** Language-specific code execution logic.

**File: `worker/src/executor/index.ts`**
```typescript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { Language } from '@prisma/client';
import { runContainer } from '../sandbox/container';
import { ExecutionResult, LanguageConfig } from '../types/execution.types';

const LANGUAGE_CONFIGS: Record<Language, LanguageConfig> = {
  PYTHON3: {
    image: 'codeex-python3:latest',
    fileName: 'solution.py',
    compileCmd: null,
    runCmd: ['python3', 'solution.py'],
  },
  JAVA: {
    image: 'codeex-java:latest',
    fileName: 'Solution.java',
    compileCmd: ['javac', 'Solution.java'],
    runCmd: ['java', 'Solution'],
  },
};

interface ExecuteOptions {
  language: Language;
  code: string;
  input: string;
  timeLimitMs: number;
  memoryLimitMb: number;
}

export async function executeCode(options: ExecuteOptions): Promise<ExecutionResult> {
  const { language, code, input, timeLimitMs, memoryLimitMb } = options;

  const config = LANGUAGE_CONFIGS[language];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const tempDir = path.join(os.tmpdir(), `codeex-${uuidv4()}`);

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(path.join(tempDir, config.fileName), code);
    await fs.writeFile(path.join(tempDir, 'input.txt'), input);

    // Compile if needed (Java)
    if (config.compileCmd) {
      const compileResult = await runContainer({
        image: config.image,
        cmd: config.compileCmd,
        binds: [`${tempDir}:/app:rw`],
        memoryMb: memoryLimitMb,
        timeoutMs: 30000,
      });

      if (compileResult.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileResult.stderr || 'Compilation failed',
          exitCode: compileResult.exitCode,
          executionTimeMs: 0,
          timedOut: false,
          compilationError: true,
        };
      }
    }

    // Run the code
    const startTime = Date.now();
    const runResult = await runContainer({
      image: config.image,
      cmd: ['sh', '-c', `cat /app/input.txt | ${config.runCmd.join(' ')}`],
      binds: [`${tempDir}:/app:ro`],
      memoryMb: memoryLimitMb,
      timeoutMs: timeLimitMs,
    });
    const executionTimeMs = Date.now() - startTime;

    return {
      stdout: runResult.stdout.trim(),
      stderr: runResult.stderr.trim(),
      exitCode: runResult.exitCode,
      executionTimeMs,
      timedOut: runResult.timedOut,
      compilationError: false,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
```

---

### Milestone 4.6 — Create Grader

**What:** Compare user output with expected output and determine verdict.

**File: `worker/src/grader/comparator.ts`**
```typescript
export function compareOutput(actual: string, expected: string): boolean {
  const normalize = (str: string): string =>
    str
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');

  return normalize(actual) === normalize(expected);
}
```

**File: `worker/src/grader/verdict.ts`**
```typescript
import { Verdict } from '@prisma/client';
import { TestCaseResult } from '../types/execution.types';

export function determineVerdict(results: TestCaseResult[]): Verdict {
  if (results.some((r) => r.compilationError)) {
    return 'COMPILATION_ERROR';
  }

  if (results.some((r) => r.timedOut)) {
    return 'TIME_LIMIT_EXCEEDED';
  }

  if (results.some((r) => r.exitCode !== 0 && !r.timedOut)) {
    return 'RUNTIME_ERROR';
  }

  if (results.every((r) => r.passed)) {
    return 'ACCEPTED';
  }

  return 'WRONG_ANSWER';
}
```

---

### Milestone 4.7 — Create Job Processor

**What:** Main job processing logic.

**File: `worker/src/processors/execution.processor.ts`**
```typescript
import { Job } from 'bullmq';
import { prisma } from '../config/database';
import { publisher } from '../config/redis';
import { executeCode } from '../executor';
import { compareOutput } from '../grader/comparator';
import { determineVerdict } from '../grader/verdict';
import { ExecutionJobPayload } from '../types/job.types';
import { TestCaseResult, SubmissionResult } from '../types/execution.types';

export async function processExecutionJob(job: Job<ExecutionJobPayload>): Promise<SubmissionResult> {
  const { submissionId, language, code, testCases, timeLimitMs, memoryLimitMb } = job.data;

  console.log(`[Worker] Processing submission: ${submissionId}`);

  // Update status to EXECUTING
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: 'EXECUTING' },
  });

  const results: TestCaseResult[] = [];
  let totalExecutionTime = 0;

  // Run each test case
  for (const testCase of testCases) {
    console.log(`[Worker]   Running test case: ${testCase.id}`);

    const result = await executeCode({
      language,
      code,
      input: testCase.input,
      timeLimitMs,
      memoryLimitMb,
    });

    const passed =
      !result.timedOut &&
      !result.compilationError &&
      result.exitCode === 0 &&
      compareOutput(result.stdout, testCase.expectedOutput);

    results.push({
      testCaseId: testCase.id,
      passed,
      ...result,
    });

    totalExecutionTime += result.executionTimeMs;

    // If compilation error, skip remaining test cases
    if (result.compilationError) break;
  }

  // Determine final verdict
  const verdict = determineVerdict(results);

  // Get output for display
  const firstFailure = results.find((r) => !r.passed);
  const stdout = results[0]?.stdout || '';
  const stderr = firstFailure?.stderr || results[0]?.stderr || '';

  // Update submission with results
  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: 'COMPLETED',
      verdict,
      executionTimeMs: totalExecutionTime,
      stdout: stdout.substring(0, 10000),
      stderr: stderr.substring(0, 10000),
    },
  });

  // Publish result for real-time notification
  const resultPayload: SubmissionResult = {
    submissionId,
    status: 'COMPLETED',
    verdict,
    executionTimeMs: totalExecutionTime,
    passedCount: results.filter((r) => r.passed).length,
    totalCount: testCases.length,
  };

  await publisher.publish(`submission:${submissionId}`, JSON.stringify(resultPayload));

  console.log(`[Worker] Completed submission: ${submissionId} - ${verdict}`);

  return resultPayload;
}
```

---

### Milestone 4.8 — Create Worker Entry Point

**What:** Initialize and start the BullMQ worker.

**File: `worker/src/index.ts`**
```typescript
import { Worker } from 'bullmq';
import { env } from './config/env';
import { redis } from './config/redis';
import { prisma } from './config/database';
import { processExecutionJob } from './processors/execution.processor';
import { ExecutionJobPayload } from './types/job.types';

const QUEUE_NAME = 'code-execution';

async function main(): Promise<void> {
  console.log('[Worker] Starting execution worker...');

  // Test database connection
  await prisma.$connect();
  console.log('[Worker] Database connected');

  // Create worker
  const worker = new Worker<ExecutionJobPayload>(
    QUEUE_NAME,
    processExecutionJob,
    {
      connection: redis,
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
  });

  console.log(`[Worker] Listening for jobs on queue: ${QUEUE_NAME}`);
  console.log(`[Worker] Concurrency: ${env.WORKER_CONCURRENCY}`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[Worker] ${signal} received, shutting down...`);
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[Worker] Failed to start:', err);
  process.exit(1);
});
```

**Success Criteria:** `npm run dev` logs "Listening for jobs..."

---

## Phase 4 Checkpoint

End-to-end test:
1. Start Postgres + Redis: `docker-compose up -d`
2. Start API: `cd api && npm run dev`
3. Start Worker: `cd worker && npm run dev`
4. Submit code via curl (see Phase 2 checkpoint)
5. Watch worker logs — should show "Processing submission..." and "Completed submission..."
6. Check submission status: `curl http://localhost:8080/api/submissions/<id> -H "Authorization: Bearer <token>"`

**Success Criteria:** Submission shows `status: "COMPLETED"` and `verdict: "ACCEPTED"` (or appropriate verdict).

---

## Phase 5 — Real-time WebSocket Layer (TypeScript)

**Goal:** Results push to browser instantly when worker finishes.

### Milestone 5.1 — Install Socket.io Dependencies

```bash
cd api
npm install @socket.io/redis-adapter
```

---

### Milestone 5.2 — Create WebSocket Setup

**What:** Set up Socket.io with Redis adapter for pub/sub.

**File: `api/src/websocket/index.ts`**
```typescript
import http from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export async function setupWebSocket(httpServer: http.Server): Promise<Server> {
  const io = new Server(httpServer, {
    cors: {
      origin: env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST'],
    },
  });

  // Setup Redis adapter for multi-instance support
  const pubClient = createClient({ url: env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));

  // Subscribe to submission results from worker
  const subscriber = createClient({ url: env.REDIS_URL });
  await subscriber.connect();

  await subscriber.pSubscribe('submission:*', (message, channel) => {
    const submissionId = channel.split(':')[1];
    const payload = JSON.parse(message);

    logger.debug(`WebSocket: Received result for ${submissionId}`);
    io.to(`submission:${submissionId}`).emit('result', payload);
  });

  // Handle client connections
  io.on('connection', (socket: Socket) => {
    logger.debug(`WebSocket: Client connected ${socket.id}`);

    socket.on('subscribe', (submissionId: string) => {
      socket.join(`submission:${submissionId}`);
      logger.debug(`WebSocket: ${socket.id} joined submission:${submissionId}`);
    });

    socket.on('unsubscribe', (submissionId: string) => {
      socket.leave(`submission:${submissionId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`WebSocket: Client disconnected ${socket.id}`);
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}
```

**Note:** The `setupWebSocket` function is already called from `server.ts` (created in Phase 2).

---

## Phase 5 Checkpoint

Test WebSocket end-to-end:

```bash
# Terminal 1: Start services
docker compose up -d
cd api && npm run dev

# Terminal 2: Start worker
cd worker && npm run dev

# Terminal 3: Test WebSocket
npm install -g wscat
wscat -c "ws://localhost:8080/socket.io/?EIO=4&transport=websocket"

# Or use browser console:
# const socket = io('http://localhost:8080');
# socket.on('result', (data) => console.log('Result:', data));
# socket.emit('subscribe', '<submissionId>');
```

**Full flow test:**
1. Register/login to get token
2. Submit code via curl
3. Immediately open WebSocket and subscribe to submissionId
4. Watch for 'result' event with verdict

---

## Phase 6 — Frontend

**Goal:** React app with Monaco editor, problem display, and real-time results.

### Milestone 6.1 — Create React App

```bash
cd frontend
npx create-react-app . --template typescript
npm install @monaco-editor/react socket.io-client axios
```

### Milestone 6.2 — Build Core Components

- **ProblemList** — displays all problems
- **ProblemDetail** — shows problem description + code editor
- **CodeEditor** — Monaco editor wrapper
- **SubmissionResult** — displays verdict with animations

### Milestone 6.3 — Implement Auth Flow

- Login/Register forms
- JWT token storage (localStorage)
- Protected routes

### Milestone 6.4 — Wire Up Socket.io

- Connect on mount
- Subscribe when submitting
- Update UI on result event

### Milestone 6.5 — Polish UI

- Loading states
- Error handling
- Responsive design

---

## Phase 7 — Docker Compose Integration

**Goal:** Single `docker-compose up` starts everything.

**File: `docker-compose.yml` (complete)**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: codeex
      POSTGRES_PASSWORD: codeex123
      POSTGRES_DB: codeex
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U codeex"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: ./api
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgresql://codeex:codeex123@postgres:5432/codeex
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-super-secret-key
      PORT: 8080
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    build: ./worker
    environment:
      DATABASE_URL: postgresql://codeex:codeex123@postgres:5432/codeex
      REDIS_URL: redis://redis:6379
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

---

## Phase 8 — Kubernetes & Autoscaling (Production)

**Goal:** Deploy to Kubernetes with KEDA autoscaling.

### Milestone 8.1 — Create Kubernetes Manifests

- Deployments for API, Worker
- Services and Ingress
- ConfigMaps and Secrets

### Milestone 8.2 — Install KEDA

```bash
kubectl apply -f https://github.com/kedacore/keda/releases/download/v2.12.0/keda-2.12.0.yaml
```

### Milestone 8.3 — Create ScaledObject

**File: `k8s/worker-scaledobject.yaml`**
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-scaledobject
spec:
  scaleTargetRef:
    name: worker
  minReplicaCount: 0
  maxReplicaCount: 20
  triggers:
    - type: redis
      metadata:
        address: redis:6379
        listName: bull:code-execution:wait
        listLength: "5"
```

This scales workers from 0 to 20 based on queue length.

### Milestone 8.4 — Load Testing

Use tools like k6 or Artillery to simulate 1000 concurrent submissions.

---

## Success Metrics

By the end of all phases:

| Metric | Target |
|--------|--------|
| Submit-to-result latency | < 5 seconds for simple code |
| Concurrent submissions | Handle 100+ without API slowdown |
| Worker auto-scale time | < 30 seconds to spin up new pods |
| Container isolation | No network, limited CPU/memory |
| Code execution timeout | Enforced at configured limit |

---

## Quick Reference Commands

```bash
# Start local development
docker-compose up -d postgres redis
cd api && npm run dev
cd worker && npm run dev
cd frontend && npm start

# View queue status
docker exec -it codeex-redis redis-cli
> LLEN bull:code-execution:wait

# View database
docker exec -it codeex-postgres psql -U codeex -d codeex

# Build sandbox images
docker build -t codeex-python3:latest ./sandbox-images/python3
docker build -t codeex-java:latest ./sandbox-images/java

# Full docker-compose
docker-compose up --build
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Worker can't connect to Docker | Ensure `/var/run/docker.sock` is mounted |
| Container timeout not working | Check Docker version supports --stop-timeout |
| Redis connection refused | Verify Redis is running and REDIS_URL is correct |
| Prisma migration fails | Check DATABASE_URL and Postgres is running |
| CORS errors in frontend | Verify API CORS settings allow frontend origin |

---

*This roadmap will be updated as we progress through each phase.*
