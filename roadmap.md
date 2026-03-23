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
| API Server       | Node.js + Express           | REST API, WebSocket server                   |
| Authentication   | JWT (jsonwebtoken)          | Stateless auth tokens                        |
| ORM              | Prisma                      | Type-safe database access                    |
| Database         | PostgreSQL                  | Persistent storage                           |
| Job Queue        | Redis + BullMQ              | Async job processing with retries            |
| Real-time        | Socket.io + Redis Adapter   | WebSocket with multi-server support          |
| Worker           | Node.js + Dockerode         | Programmatic Docker container management     |
| Sandbox          | Docker containers           | Isolated code execution                      |
| Frontend         | React + Monaco Editor       | Code editor UI                               |
| Local Dev        | Docker Compose              | One-command local environment                |
| Orchestration    | Kubernetes + KEDA           | Production scaling (Phase 3)                 |

---

## Phase 0 — Environment Setup & Project Scaffold

**Goal:** One command creates the full folder structure. All prerequisites verified.

### Milestone 0.1 — Verify Prerequisites

**What:** Ensure all required tools are installed on your machine.

**Steps:**
1. Check Node.js version (need 18+):
   ```bash
   node --version
   ```
2. Check Docker is running:
   ```bash
   docker --version
   docker ps
   ```
3. Check Docker Compose:
   ```bash
   docker-compose --version
   ```
4. Check Git:
   ```bash
   git --version
   ```

**Success Criteria:** All four commands return version numbers without errors.

---

### Milestone 0.2 — Create Project Structure

**What:** Set up the monorepo folder structure.

**Steps:**
1. Create root directory and enter it:
   ```bash
   mkdir code-execution-platform && cd code-execution-platform
   ```
2. Create all subdirectories:
   ```bash
   mkdir -p api/src/{routes,middleware,db,queue,websocket}
   mkdir -p api/prisma
   mkdir -p worker/src/{executor,grader}
   mkdir -p frontend/src
   mkdir -p sandbox-images/{python3,java}
   mkdir -p k8s
   ```

**Resulting Structure:**
```
code-execution-platform/
├── api/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── db/
│   │   ├── queue/
│   │   └── websocket/
│   └── prisma/
├── worker/
│   └── src/
│       ├── executor/
│       └── grader/
├── frontend/
│   └── src/
├── sandbox-images/
│   ├── python3/
│   └── java/
└── k8s/
```

**Success Criteria:** Running `tree` or `ls -R` shows the complete structure.

---

### Milestone 0.3 — Initialize Node.js Projects

**What:** Create `package.json` for API and Worker services.

**Steps:**
1. Initialize API:
   ```bash
   cd api
   npm init -y
   cd ..
   ```
2. Initialize Worker:
   ```bash
   cd worker
   npm init -y
   cd ..
   ```

**Success Criteria:** Both `api/package.json` and `worker/package.json` exist.

---

### Milestone 0.4 — Create Docker Compose Skeleton

**What:** Create a minimal `docker-compose.yml` with just PostgreSQL and Redis.

**Steps:**
1. Create `docker-compose.yml` in the project root with:
   - PostgreSQL 15 on port 5432
   - Redis 7 on port 6379
   - Persistent volumes for data

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
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

2. Start the services:
   ```bash
   docker-compose up -d
   ```
3. Verify they are running:
   ```bash
   docker-compose ps
   ```

**Success Criteria:** Both containers show as "healthy" in `docker-compose ps`.

---

### Milestone 0.5 — Create Environment Files

**What:** Set up `.env` files for configuration.

**Steps:**
1. Create `api/.env`:
   ```env
   DATABASE_URL="postgresql://codeex:codeex123@localhost:5432/codeex"
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET="your-super-secret-key-change-in-production"
   PORT=8080
   ```
2. Create `worker/.env`:
   ```env
   DATABASE_URL="postgresql://codeex:codeex123@localhost:5432/codeex"
   REDIS_URL="redis://localhost:6379"
   ```
3. Add `.env` to `.gitignore` at the project root.

**Success Criteria:** Environment files exist and are git-ignored.

---

## Phase 0 Checkpoint

Run these commands to verify Phase 0 is complete:
```bash
docker-compose ps          # Shows postgres and redis as healthy
ls api/package.json        # File exists
ls worker/package.json     # File exists
ls api/.env                # File exists
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

### Milestone 1.4 — Create Seed Script

**What:** Write a script to insert sample data for testing.

**File: `api/prisma/seed.js`**
```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.submission.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.user.deleteMany();

  // Create a sample problem: Two Sum
  const problem = await prisma.problem.create({
    data: {
      title: 'Two Sum',
      description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Example:**
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

**Input Format:**
- First line: space-separated integers (the array)
- Second line: the target integer

**Output Format:**
- Two space-separated indices`,
      difficulty: 'EASY',
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      testCases: {
        create: [
          {
            input: '2 7 11 15\n9',
            expectedOutput: '0 1',
            isSample: true,
          },
          {
            input: '3 2 4\n6',
            expectedOutput: '1 2',
            isSample: true,
          },
          {
            input: '3 3\n6',
            expectedOutput: '0 1',
            isSample: false,
          },
        ],
      },
    },
  });

  console.log('Seeded problem:', problem.title);
  console.log('Problem ID:', problem.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Steps:**
1. Add seed command to `api/package.json`:
   ```json
   {
     "prisma": {
       "seed": "node prisma/seed.js"
     }
   }
   ```
2. Run the seed:
   ```bash
   npx prisma db seed
   ```

**Success Criteria:** Console shows "Seeded problem: Two Sum" with a UUID.

---

### Milestone 1.5 — Create Prisma Client Export

**What:** Create a reusable database client module.

**File: `api/src/db/client.js`**
```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
```

**Success Criteria:** File exists and can be imported elsewhere.

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

**Goal:** Express server running with health check, CORS, and structured routing.

### Milestone 2.1 — Install Dependencies

**What:** Add all required packages for the API server.

**Steps:**
```bash
cd api
npm install express cors helmet dotenv jsonwebtoken bcryptjs bullmq socket.io ioredis uuid
npm install --save-dev nodemon
```

**Package Purposes:**
- `express` — HTTP server framework
- `cors` — Cross-Origin Resource Sharing middleware
- `helmet` — Security headers
- `dotenv` — Environment variable loading
- `jsonwebtoken` — JWT token creation/verification
- `bcryptjs` — Password hashing
- `bullmq` — Job queue library
- `socket.io` — WebSocket server
- `ioredis` — Redis client (required by BullMQ)
- `uuid` — Generate unique IDs
- `nodemon` — Auto-restart during development

**Success Criteria:** All packages installed without errors.

---

### Milestone 2.2 — Create Express App Entry Point

**What:** Set up the main Express application.

**File: `api/src/index.js`**
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes will be added here
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/problems', require('./routes/problems'));
// app.use('/api/submissions', require('./routes/submissions'));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});

module.exports = { app, server };
```

**File: `api/package.json` (add scripts)**
```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  }
}
```

**Steps:**
1. Start the server:
   ```bash
   npm run dev
   ```
2. Test health endpoint:
   ```bash
   curl http://localhost:8080/health
   ```

**Success Criteria:** Health check returns `{"status":"ok","timestamp":"..."}`.

---

### Milestone 2.3 — Create Auth Middleware

**What:** JWT verification middleware for protected routes.

**File: `api/src/middleware/auth.js`**
```javascript
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
```

**Success Criteria:** Middleware file created and exports a function.

---

### Milestone 2.4 — Create Auth Routes

**What:** Register and login endpoints.

**File: `api/src/routes/auth.js`**
```javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db/client');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
```

**Success Criteria:** Register and login endpoints work via curl/Postman.

---

### Milestone 2.5 — Create Problems Routes

**What:** Endpoints to list and view coding problems.

**File: `api/src/routes/problems.js`**
```javascript
const express = require('express');
const prisma = require('../db/client');

const router = express.Router();

// GET /api/problems - List all problems
router.get('/', async (req, res) => {
  try {
    const problems = await prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        difficulty: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(problems);
  } catch (error) {
    console.error('List problems error:', error);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

// GET /api/problems/:id - Get problem details with sample test cases
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const problem = await prisma.problem.findUnique({
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

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json(problem);
  } catch (error) {
    console.error('Get problem error:', error);
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
});

module.exports = router;
```

**Success Criteria:** GET `/api/problems` returns the seeded problem list.

---

### Milestone 2.6 — Create BullMQ Producer

**What:** Module to add jobs to the execution queue.

**File: `api/src/queue/producer.js`**
```javascript
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const executionQueue = new Queue('code-execution', { connection });

async function addExecutionJob(data) {
  const job = await executionQueue.add('execute', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  });

  return job.id;
}

module.exports = { executionQueue, addExecutionJob };
```

**Job Data Structure:**
```javascript
{
  submissionId: 'uuid',
  userId: 'uuid',
  problemId: 'uuid',
  language: 'PYTHON3',
  code: 'print(input())',
  testCases: [
    { id: 'tc-1', input: 'hello', expectedOutput: 'hello' }
  ],
  timeLimitMs: 2000,
  memoryLimitMb: 256
}
```

**Success Criteria:** Module exports `addExecutionJob` function.

---

### Milestone 2.7 — Create Submissions Routes

**What:** Submit code endpoint that queues the job.

**File: `api/src/routes/submissions.js`**
```javascript
const express = require('express');
const prisma = require('../db/client');
const authMiddleware = require('../middleware/auth');
const { addExecutionJob } = require('../queue/producer');

const router = express.Router();

// POST /api/submissions - Submit code for execution
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { problemId, language, code } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!problemId || !language || !code) {
      return res.status(400).json({ error: 'problemId, language, and code are required' });
    }

    // Validate language
    const validLanguages = ['PYTHON3', 'JAVA'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({ error: `Invalid language. Must be one of: ${validLanguages.join(', ')}` });
    }

    // Fetch problem with ALL test cases (not just samples)
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testCases: true,
      },
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Create submission in PENDING state
    const submission = await prisma.submission.create({
      data: {
        userId,
        problemId,
        language,
        code,
        status: 'PENDING',
      },
    });

    // Queue the job
    const jobId = await addExecutionJob({
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
    });

    res.status(202).json({
      message: 'Submission received',
      submissionId: submission.id,
      jobId,
    });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Submission failed' });
  }
});

// GET /api/submissions/:id - Get submission status
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const submission = await prisma.submission.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        problem: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(submission);
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// GET /api/submissions - List user's submissions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const submissions = await prisma.submission.findMany({
      where: { userId },
      include: {
        problem: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(submissions);
  } catch (error) {
    console.error('List submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

module.exports = router;
```

**Success Criteria:** POST `/api/submissions` creates a submission and returns 202.

---

### Milestone 2.8 — Wire Up All Routes

**What:** Connect all routes to the Express app.

**Update: `api/src/index.js`**
```javascript
// Add these lines after middleware setup, before error handler:

app.use('/api/auth', require('./routes/auth'));
app.use('/api/problems', require('./routes/problems'));
app.use('/api/submissions', require('./routes/submissions'));
```

**Success Criteria:** All routes respond correctly.

---

## Phase 2 Checkpoint

Test the complete API:
```bash
# 1. Health check
curl http://localhost:8080/health

# 2. Register a user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"password123"}'

# Save the token from the response

# 3. List problems
curl http://localhost:8080/api/problems

# 4. Get problem details
curl http://localhost:8080/api/problems/<problem-id>

# 5. Submit code (replace <token> and <problem-id>)
curl -X POST http://localhost:8080/api/submissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"problemId":"<problem-id>","language":"PYTHON3","code":"nums = list(map(int, input().split()))\ntarget = int(input())\nfor i in range(len(nums)):\n    for j in range(i+1, len(nums)):\n        if nums[i] + nums[j] == target:\n            print(i, j)\n            break"}'

# Should return 202 with submissionId
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

## Phase 4 — Execution Worker

**Goal:** Worker service that pulls jobs from queue, executes code in Docker, and grades output.

### Milestone 4.1 — Install Worker Dependencies

**What:** Add required packages for the worker service.

**Steps:**
```bash
cd worker
npm install bullmq ioredis dockerode dotenv @prisma/client
npm install --save-dev nodemon
```

**Package Purposes:**
- `bullmq` — Job queue consumer
- `ioredis` — Redis client
- `dockerode` — Docker API client for Node.js
- `dotenv` — Environment variables
- `@prisma/client` — Database access

**Copy Prisma schema to worker:**
```bash
cp -r ../api/prisma ./prisma
npx prisma generate
```

**Success Criteria:** All packages installed.

---

### Milestone 4.2 — Create Docker Executor

**What:** Module that runs code inside a Docker container.

**File: `worker/src/executor/docker.js`**
```javascript
const Docker = require('dockerode');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const docker = new Docker();

const LANGUAGE_CONFIG = {
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

async function executeCode({ language, code, input, timeLimitMs, memoryLimitMb }) {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  // Create temp directory for this execution
  const tempDir = path.join(os.tmpdir(), `codeex-${uuidv4()}`);
  await fs.mkdir(tempDir, { recursive: true });

  // Write code to file
  const codeFilePath = path.join(tempDir, config.fileName);
  await fs.writeFile(codeFilePath, code);

  // Write input to file
  const inputFilePath = path.join(tempDir, 'input.txt');
  await fs.writeFile(inputFilePath, input);

  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  let executionTimeMs = 0;
  let timedOut = false;

  try {
    // Compile if needed (Java)
    if (config.compileCmd) {
      const compileResult = await runContainer({
        image: config.image,
        cmd: config.compileCmd,
        binds: [`${tempDir}:/app:rw`],
        memoryMb: memoryLimitMb,
        timeoutMs: 30000, // 30 seconds for compilation
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
    executionTimeMs = Date.now() - startTime;

    stdout = runResult.stdout;
    stderr = runResult.stderr;
    exitCode = runResult.exitCode;
    timedOut = runResult.timedOut;
  } finally {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode,
    executionTimeMs,
    timedOut,
    compilationError: false,
  };
}

async function runContainer({ image, cmd, binds, memoryMb, timeoutMs }) {
  return new Promise(async (resolve) => {
    let container;
    let timeoutHandle;
    let timedOut = false;

    try {
      container = await docker.createContainer({
        Image: image,
        Cmd: cmd,
        WorkingDir: '/app',
        User: '1000:1000',
        HostConfig: {
          Binds: binds,
          Memory: memoryMb * 1024 * 1024,
          MemorySwap: memoryMb * 1024 * 1024,
          CpuPeriod: 100000,
          CpuQuota: 50000, // 50% of one CPU
          NetworkMode: 'none',
          PidsLimit: 50,
          ReadonlyRootfs: false, // Java needs to write .class files
        },
        AttachStdout: true,
        AttachStderr: true,
      });

      // Set timeout
      timeoutHandle = setTimeout(async () => {
        timedOut = true;
        try {
          await container.kill();
        } catch (e) {
          // Container might have already finished
        }
      }, timeoutMs);

      await container.start();

      // Wait for container to finish
      const waitResult = await container.wait();

      clearTimeout(timeoutHandle);

      // Get logs
      const logs = await container.logs({
        stdout: true,
        stderr: true,
      });

      // Parse logs (Docker multiplexes stdout/stderr)
      const output = parseDockerLogs(logs);

      resolve({
        stdout: output.stdout,
        stderr: output.stderr,
        exitCode: waitResult.StatusCode,
        timedOut,
      });
    } catch (error) {
      clearTimeout(timeoutHandle);
      resolve({
        stdout: '',
        stderr: error.message,
        exitCode: 1,
        timedOut,
      });
    } finally {
      // Cleanup container
      if (container) {
        try {
          await container.remove({ force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  });
}

function parseDockerLogs(buffer) {
  // Docker log format: 8-byte header + data
  // Header: [stream_type (1 byte)][0,0,0][size (4 bytes)]
  let stdout = '';
  let stderr = '';
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) break;

    const streamType = buffer[offset];
    const size = buffer.readUInt32BE(offset + 4);

    if (offset + 8 + size > buffer.length) break;

    const data = buffer.slice(offset + 8, offset + 8 + size).toString('utf8');

    if (streamType === 1) {
      stdout += data;
    } else if (streamType === 2) {
      stderr += data;
    }

    offset += 8 + size;
  }

  return { stdout, stderr };
}

module.exports = { executeCode };
```

**Success Criteria:** Module exports `executeCode` function.

---

### Milestone 4.3 — Create Grader Module

**What:** Compare user output with expected output.

**File: `worker/src/grader/compare.js`**
```javascript
function compareOutput(actual, expected) {
  // Normalize: trim whitespace, normalize line endings
  const normalizedActual = actual
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  const normalizedExpected = expected
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return normalizedActual === normalizedExpected;
}

function determineVerdict(results) {
  // Check for compilation error first
  if (results.some((r) => r.compilationError)) {
    return 'COMPILATION_ERROR';
  }

  // Check for timeout
  if (results.some((r) => r.timedOut)) {
    return 'TIME_LIMIT_EXCEEDED';
  }

  // Check for runtime error
  if (results.some((r) => r.exitCode !== 0 && !r.timedOut)) {
    return 'RUNTIME_ERROR';
  }

  // Check all test cases passed
  if (results.every((r) => r.passed)) {
    return 'ACCEPTED';
  }

  return 'WRONG_ANSWER';
}

module.exports = { compareOutput, determineVerdict };
```

**Success Criteria:** Module exports comparison functions.

---

### Milestone 4.4 — Create Worker Consumer

**What:** BullMQ worker that processes execution jobs.

**File: `worker/src/index.js`**
```javascript
require('dotenv').config();
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { executeCode } = require('./executor/docker');
const { compareOutput, determineVerdict } = require('./grader/compare');

const prisma = new PrismaClient();

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Redis publisher for real-time updates
const publisher = new IORedis(process.env.REDIS_URL);

const worker = new Worker(
  'code-execution',
  async (job) => {
    const { submissionId, language, code, testCases, timeLimitMs, memoryLimitMb } = job.data;

    console.log(`Processing submission: ${submissionId}`);

    // Update status to EXECUTING
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'EXECUTING' },
    });

    const results = [];
    let totalExecutionTime = 0;

    // Run each test case
    for (const testCase of testCases) {
      console.log(`  Running test case: ${testCase.id}`);

      const result = await executeCode({
        language,
        code,
        input: testCase.input,
        timeLimitMs,
        memoryLimitMb,
      });

      const passed = !result.timedOut &&
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
      if (result.compilationError) {
        break;
      }
    }

    // Determine final verdict
    const verdict = determineVerdict(results);

    // Get first error output for display
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
        stdout: stdout.substring(0, 10000), // Limit stored output
        stderr: stderr.substring(0, 10000),
      },
    });

    // Publish result for real-time notification
    const resultPayload = {
      submissionId,
      status: 'COMPLETED',
      verdict,
      executionTimeMs: totalExecutionTime,
      passedCount: results.filter((r) => r.passed).length,
      totalCount: testCases.length,
    };

    await publisher.publish(`submission:${submissionId}`, JSON.stringify(resultPayload));

    console.log(`Completed submission: ${submissionId} - ${verdict}`);

    return resultPayload;
  },
  {
    connection,
    concurrency: 2, // Process 2 jobs at a time
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

console.log('Worker started, waiting for jobs...');
```

**File: `worker/package.json` (add scripts)**
```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "uuid": "^9.0.0"
  }
}
```

**Steps:**
1. Add uuid to worker:
   ```bash
   cd worker
   npm install uuid
   ```
2. Start the worker:
   ```bash
   npm run dev
   ```

**Success Criteria:** Worker logs "Worker started, waiting for jobs..."

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

## Phase 5 — Real-time WebSocket Layer

**Goal:** Results push to browser instantly when worker finishes.

### Milestone 5.1 — Add Socket.io to API Server

**What:** Set up WebSocket server with Redis adapter.

**File: `api/src/websocket/socket.js`**
```javascript
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

async function setupWebSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Setup Redis adapter for multi-server support
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));

  // Subscribe to submission results
  const subscriber = createClient({ url: process.env.REDIS_URL });
  await subscriber.connect();

  // Pattern subscribe to all submission channels
  await subscriber.pSubscribe('submission:*', (message, channel) => {
    const submissionId = channel.split(':')[1];
    const payload = JSON.parse(message);

    // Emit to the specific room
    io.to(`submission:${submissionId}`).emit('result', payload);
  });

  // Handle client connections
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join submission room
    socket.on('subscribe', (submissionId) => {
      socket.join(`submission:${submissionId}`);
      console.log(`${socket.id} subscribed to submission:${submissionId}`);
    });

    // Leave submission room
    socket.on('unsubscribe', (submissionId) => {
      socket.leave(`submission:${submissionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = { setupWebSocket };
```

**Install Redis adapter:**
```bash
cd api
npm install @socket.io/redis-adapter redis
```

**Update: `api/src/index.js`**
```javascript
// Add at the top
const { setupWebSocket } = require('./websocket/socket');

// Replace server.listen with:
server.listen(PORT, async () => {
  console.log(`API Server running on port ${PORT}`);

  // Setup WebSocket
  await setupWebSocket(server);
  console.log('WebSocket server ready');
});
```

**Success Criteria:** Server logs "WebSocket server ready".

---

## Phase 5 Checkpoint

Test WebSocket with a simple HTML page or wscat:
```bash
npm install -g wscat
wscat -c ws://localhost:8080/socket.io/?EIO=4&transport=websocket
```

Or test end-to-end:
1. Open browser console
2. Connect to Socket.io
3. Subscribe to a submission
4. Submit code via curl
5. Watch console for 'result' event

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
