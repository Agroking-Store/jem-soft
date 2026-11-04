# JEM Soft — Enterprise Insurance Agency Management System

Welcome to the **JEM Soft** codebase! This document serves as the onboarding guide and technical documentation for engineering team members. It details the architecture, local setup procedures, environment specifications, domain structure, and operational runbooks.

---

## 1. System Architecture & Tech Stack

JEM Soft is a full-stack monorepo built specifically for insurance agency operations, with specialized calculators, quotation engines, and record management tailored for the **Life Insurance Corporation of India (LIC)** ecosystem.

```
┌────────────────────────────────────────────────────────┐
│                   Frontend (Next.js 16)                │
│    React 19 • App Router • Redux Toolkit • Tailwind 4   │
│              Runs on http://localhost:3000             │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP REST (Axios)
                           ▼
┌────────────────────────────────────────────────────────┐
│               Backend (Node.js / Express 4)            │
│       TypeScript • JWT Auth • Node-Cron • Multer       │
│              Runs on http://localhost:5000             │
└──────────────────────────┬─────────────────────────────┘
                           │ Prisma ORM 6
                           ▼
┌────────────────────────────────────────────────────────┐
│               Database (PostgreSQL 16+)                │
│     40+ Enterprise Tables • Plan Rates • Master Data   │
│                 Port 5432 (Database: jemsoft)          │
└────────────────────────────────────────────────────────┘
```

### Core Technologies

| Layer | Technologies & Frameworks |
|---|---|
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router), React 19, TypeScript, [Redux Toolkit](https://redux-toolkit.js.org/), [Tailwind CSS v4](https://tailwindcss.com/), Axios, React Hook Form, Zod, Lucide Icons, jsPDF |
| **Backend** | [Node.js](https://nodejs.org/) (v20+ / v22 LTS), [Express.js](https://expressjs.com/), TypeScript (`tsx`), JWT, Multer, Node-Cron, Nodemailer |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/) (15+ / 16+ / 18), [Prisma ORM v6](https://www.prisma.io/) |

---

## 2. Repository Layout

```
jem-soft/
├── backend/                       # REST API & Business Logic
│   ├── prisma/
│   │   ├── schema.prisma          # Authoritative DB schema (40+ models)
│   │   ├── seed.ts                # Master seeder entrypoint
│   │   ├── seeds/                 # Domain-specific seed scripts
│   │   ├── masterData/            # Rebates, factors, and rate matrices
│   │   └── Creations.db           # Local SQLite store for tabular rate extracts
│   └── src/
│       ├── config/                # Environment and DB singletons
│       ├── controllers/           # HTTP Request handlers
│       ├── middlewares/           # Auth and error handling
│       ├── routes/                # Express API endpoints (/api/*)
│       ├── services/              # Business logic & 17+ LIC plan calculators
│       │   └── premiumcalculators/
│       ├── utils/                 # Token generators, file upload utilities
│       ├── app.ts                 # Express application configuration
│       └── server.ts              # Server bootstrapper & cron initializers
│
├── frontend/                      # Web Application
│   ├── public/                    # Static assets
│   └── src/
│       ├── app/                   # App Router pages: (auth), (dashboard), customer-portal
│       ├── features/              # 18 Redux domain slices (claims, policies, etc.)
│       ├── lib/                   # Axios HTTP clients & interceptors
│       ├── shared/                # Layout shells, Navigation, Header, Reusable UI
│       ├── store/                 # Redux store & React context providers
│       └── proxy.ts               # Route guard utilities
│
└── tokens/                        # WhatsApp integration session caches
```

---

## 3. Prerequisites

Before setting up the project locally, ensure you have the following installed on your workstation:

- **Node.js**: `v20.x` or `v22.x` LTS ([Download](https://nodejs.org/))
- **npm**: `v10.x` or higher (bundled with Node.js)
- **PostgreSQL**: `v15`, `v16`, or `v18` running locally on port `5432` ([Download](https://www.postgresql.org/download/))
- **Git**: Installed and configured with your organization credentials

---

## 4. First-Time Local Setup (Step-by-Step)

Follow these steps sequentially to set up your local development environment:

### Step 4.1: Database Initialization
1. Start your local PostgreSQL service.
2. Open `psql`, `pgAdmin`, or your database GUI and create the application database:
   ```sql
   CREATE DATABASE jemsoft;
   ```

### Step 4.2: Configure Environment Variables

#### Backend Configuration:
Create a file named `.env` in the `backend/` directory:
```bash
# Path: backend/.env

# Database connection (replace 'YOUR_DB_PASSWORD' with your local postgres password)
DATABASE_URL="postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/jemsoft?schema=public"

# Server Port
PORT=5000

# Permitted CORS Origin
CLIENT_URL="http://localhost:3000"

# Authentication
JWT_SECRET="dev-insecure-jwt-secret-replace-in-production"
JWT_EXPIRES_IN="7d"

# Optional Email / Notification Service (Development fallback active if omitted)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
```

#### Frontend Configuration:
Create a file named `.env.local` in the `frontend/` directory:
```bash
# Path: frontend/.env.local
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

---

### Step 4.3: Backend Setup & Schema Push

Open a terminal and navigate to the backend directory:

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Generate the Prisma Client
npx prisma generate

# 3. Push schema to your local PostgreSQL database
npx prisma db push
```

> **Note on Database Seeding:**  
> The database schema will be ready and usable immediately after `prisma db push`.  
> If you need full offline LIC actuarial rates and provider master data seeded:
> ```bash
> npx prisma db seed
> ```
> *(Note: The seed script reads from `prisma/Creations.db` using `better-sqlite3`. If you receive a module error during seed, run `npm i -D better-sqlite3 @types/better-sqlite3` temporarily.)*

---

### Step 4.4: Frontend Setup

Open a separate terminal window and navigate to the frontend directory:

```bash
cd frontend

# 1. Install dependencies
npm install
```

---

## 5. Running the Application Locally

You will need **two terminal instances** running concurrently:

### Terminal 1 — Backend API
```bash
cd backend
npm run dev
```
- **Endpoint**: `http://localhost:5000`
- **Healthcheck**: `http://localhost:5000/test`
- Automated cron jobs and template seeding will initialize on server boot.

### Terminal 2 — Frontend Application
```bash
cd frontend
npm run dev
```
- **Application URL**: `http://localhost:3000`
- The application will automatically route to `/login` or `/dashboard`.

---

## 6. Essential Engineering Runbooks & Commands

| Task | Location | Command |
|---|---|---|
| Launch Backend Dev Server | `backend/` | `npm run dev` |
| Launch Frontend Dev Server | `frontend/` | `npm run dev` |
| Open Visual DB GUI (Prisma Studio) | `backend/` | `npx prisma studio` (opens `http://localhost:5555`) |
| Push Prisma Schema Changes | `backend/` | `npx prisma db push` |
| Regenerate Prisma Types | `backend/` | `npx prisma generate` |
| Seed Master Data | `backend/` | `npx prisma db seed` |
| Build Backend TypeScript | `backend/` | `npm run build` |
| Build Frontend Next.js Bundle | `frontend/` | `npm run build` |
| Run Frontend Linter | `frontend/` | `npm run lint` |

---

## 7. Key Architecture & Business Domain Notes

### 1. Actuarial Calculation Engine
Located in `backend/src/services/premiumcalculators/`.  
Contains individual plan rules and calculations for key LIC plans, including:
- Plan 714 (New Endowment)
- Plan 715 (Jeevan Anand)
- Plan 717, 720, 721 (Money Back plans)
- Plan 745, 748, 751 (Child / Specialized plans)
- Plan 883, 887, 888, 889, 912 (Modern Term & Guaranteed Return plans)

### 2. Dual Authorization & Portals
- **Enterprise Dashboard (`/dashboard`)**: Intended for agency owners, administrators, and advisors. Authenticated via standard JWT bearer tokens stored in cookies/localStorage.
- **Customer Self-Service Portal (`/customer-portal`)**: Dedicated portal for policyholders to inspect policies, review premium due dates, and download statements using separate portal tokens.

### 3. State Management Convention
The frontend utilizes **Redux Toolkit** partitioned by business entities under `frontend/src/features/`. Always create new feature slices with standard async thunks and hook wrappers rather than introducing standalone component state for entity models.

---

## 8. Git & Contributing Guidelines

- **Protected Branches**: `main` is protected. Do not commit directly to `main`.
- **Branch Naming**:
  - `feat/feature-name`
  - `fix/bug-description`
  - `refactor/scope`
- **Environment Safety**: Never commit `.env` or `.env.local` files to version control. They are strictly ignored via `.gitignore`.
- Always verify your branch builds cleanly before submitting a Pull Request:
  ```bash
  # In backend:
  npm run build

  # In frontend:
  npm run build
  ```

---

*For questions, architectural guidance, or domain specifics, reach out to the engineering lead or check existing PR discussions.*

