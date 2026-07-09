# TruckDispatch — Truck & Cargo Marketplace

Web-based logistics platform that connects **Fleet Managers** (customers), **dispatchers**, **drivers**, and **admins** in one workflow: book cargo, assign trucks, track trips in real time, and manage payments.

> **Design rule:** One driver account = one truck. Drivers cannot register without truck details.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Authentication (email OTP)](#authentication-email-otp)
- [Demo accounts](#demo-accounts)
- [User roles & capabilities](#user-roles--capabilities)
- [API overview](#api-overview)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)
- [Deployment notes](#deployment-notes)
- [License](#license)

---

## Features

| Area | Highlights |
|------|------------|
| **Auth** | Register, login, forgot password — all protected by **email OTP** (6-digit code) |
| **Fleet Manager** | Book trucks, view/edit/cancel cargo requests, track shipments, confirm delivery |
| **Dispatcher** | Manage requests, assign drivers/trucks, monitor trips and live tracking |
| **Driver** | Accept/reject jobs, advance trip status, share GPS, upload POD (proof of delivery) |
| **Admin** | Users, trucks, trips, payments, reports, audit logs, system settings |
| **Realtime** | Socket.io for trip status, notifications, and location updates |
| **UI** | React dashboards per role, dark/light theme, responsive layout |

---

## Tech stack

### Frontend (`frontend/`)

- React 19 + Vite 6
- React Router 7
- TanStack React Query
- React Hook Form
- Tailwind CSS 4
- Axios + Socket.io Client
- Recharts
- Lucide React icons

### Backend (`backend/`)

- Node.js (ES modules) + Express 4
- Prisma ORM + PostgreSQL
- JWT authentication
- Zod validation
- Socket.io
- Multer (file uploads)
- Nodemailer (Gmail SMTP for OTP)

### Infrastructure

- **PostgreSQL 16** via Docker Compose (recommended for local dev)
- Vercel deploy for frontend + API (see [Deployment notes](#deployment-notes))

---

## Project structure

```
truck-dispa/
├── backend/
│   ├── config/           # Database connection helpers
│   ├── db/               # Legacy SQL schema reference
│   ├── lib/              # Prisma client singleton
│   ├── middleware/       # Auth, validation, errors
│   ├── prisma/           # Schema, migrations, seed
│   ├── routes/           # REST API route modules
│   ├── services/         # dbService, emailService
│   ├── uploads/          # POD / proof uploads
│   └── index.js          # API entry point
├── frontend/
│   └── src/
│       ├── components/   # Shared UI components
│       ├── contexts/     # Auth, theme, settings
│       ├── hooks/        # React Query API hooks
│       ├── layouts/      # Dashboard shell
│       ├── pages/        # Role-based pages
│       └── services/     # Axios API client
├── docker-compose.yml    # Local PostgreSQL
└── package.json          # Root scripts (run both apps)
```

---

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** 9+
- **Docker Desktop** (recommended) — for local PostgreSQL
- **Gmail account** with [App Password](https://support.google.com/accounts/answer/185833) — for OTP emails in development

---

## Quick start

### 1. Clone the repository

```bash
git clone https://github.com/Yasin-dev10/truck-dispa.git
cd truck-dispa
```

### 2. Start PostgreSQL (Docker)

```bash
docker compose up -d
```

This starts Postgres on `127.0.0.1:5432` with:

| Setting | Value |
|---------|-------|
| User | `truck` |
| Password | `truckpass` |
| Database | `truck_dispatch` |

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env`:

- Set `DATABASE_URL` (default works with Docker above)
- Set `JWT_SECRET` to a strong random string
- Configure Gmail SMTP for OTP (see [Environment variables](#environment-variables))

### 4. Install dependencies

```bash
npm run install:all
```

### 5. Set up the database

```bash
cd backend
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

### 6. Run the apps

From the project root:

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://127.0.0.1:5173 |
| API | http://127.0.0.1:4000/api |
| Health check | http://127.0.0.1:4000/api/health |

Run separately if needed:

```bash
npm run dev:backend
npm run dev:frontend
```

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | API server port | `4000` |
| `CLIENT_ORIGIN` | Allowed CORS origins (comma-separated) | `http://127.0.0.1:5173,http://localhost:5173` |
| `JWT_SECRET` | Secret for signing JWT tokens | `your-secret-key` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://truck:truckpass@127.0.0.1:5432/truck_dispatch?connection_limit=5&pool_timeout=30` |
| `EMAIL_DEV_MODE` | Skip real email when `true` (dev only) | `false` |
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | Use TLS | `false` |
| `SMTP_USER` | Gmail address | `your@gmail.com` |
| `SMTP_PASS` | Gmail App Password (16 chars) | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM` | From header | `TruckDispatch <your@gmail.com>` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://127.0.0.1:4000/api` |
| `VITE_SOCKET_URL` | Socket.io server URL | `http://127.0.0.1:4000` |

> Never commit `.env` files. They are listed in `.gitignore`.

---

## Database

### Schema (Prisma)

Main models: `User`, `Truck`, `TruckType`, `CargoRequest`, `Trip`, `Payment`, `Notification`, `Setting`, `AuditLog`, `VerificationCode`.

### Commands

```bash
cd backend

npm run prisma:generate   # Generate Prisma client
npm run prisma:push       # Apply schema to database
npm run prisma:migrate    # Create/run migrations (dev)
npm run prisma:seed       # Seed demo data + ensure admin exists
npm run prisma:studio     # Open Prisma Studio GUI
```

### Auto-seed on startup

When the API starts with an **empty** database, it automatically seeds demo users, trucks, trips, and sample data. The admin account email can be customized in `backend/prisma/seed.js` (`ADMIN` constant).

---

## Authentication (email OTP)

Login and registration use a **two-step flow**:

1. Submit email + password → server validates credentials and sends a **6-digit code** to the user's inbox.
2. Submit email + code → server returns a JWT and the user is signed in.

The verification code is **never shown in the UI** — check the email inbox (or configure `EMAIL_DEV_MODE=true` only for local debugging).

Endpoints:

- `POST /api/auth/register` → `POST /api/auth/register/verify`
- `POST /api/auth/login` → `POST /api/auth/login/verify`
- `POST /api/auth/resend-code`
- `POST /api/auth/forgot-password` → `POST /api/auth/reset-password`

---

## Demo accounts

Default password for all seeded users: **`Password123!`**

| Role | UI label | Email |
|------|----------|-------|
| Admin | Admin | `admin@truckdispatch.local` *(or email set in `prisma/seed.js`)* |
| Dispatcher | Dispatcher | `dispatcher@truckdispatch.local` |
| Customer | Fleet Manager | `customer@truckdispatch.local` |
| Driver | Driver Account | `driver@truckdispatch.local` |

Additional seeded drivers: `driver2@truckdispatch.local`, `driver3@truckdispatch.local`

---

## User roles & capabilities

### Admin

- Full CRUD on users, trucks, trips, payments
- Audit logs, reports, system settings
- Routes: `/admin/*`

### Dispatcher

- Manage cargo requests and trip assignments
- Fleet overview, tracking, notifications
- Routes: `/dispatcher/*`

### Fleet Manager (customer)

| CRUD | Actions |
|------|---------|
| **Create** | Book a truck (new cargo request) |
| **Read** | View shipments, trips, tracking |
| **Update** | Edit pending requests |
| **Cancel** | Cancel requests (before Loaded / In Transit) |

Routes: `/customer/*`

### Driver Account

| CRUD | Actions |
|------|---------|
| **Create** | Upload POD, share GPS location |
| **Read** | My Jobs, My Truck, notifications |
| **Update** | Accept job, advance status, truck availability |
| **Cancel** | Reject assigned job |

Routes: `/driver/*`

---

## API overview

Base URL: `http://127.0.0.1:4000/api`

| Prefix | Description |
|--------|-------------|
| `/auth` | Register, login, OTP verify, profile, password reset |
| `/users` | User management (admin) |
| `/cargo-requests` | Cargo request CRUD + assignment |
| `/trips` | Trips list, status, accept/reject, GPS, POD upload |
| `/trucks` | Truck fleet CRUD + types |
| `/notifications` | In-app notifications |
| `/reports` | Dashboard stats, revenue, performance |
| `/admin` | Payments, settings, audit logs |

Authenticated requests require header:

```
Authorization: Bearer <jwt_token>
```

### Trip status flow

```
Pending → Assigned → Accepted → Arrived Pickup → Loaded → In Transit → Delivered
```

Also supported: `Delayed`, `Cancelled`

---

## Scripts

### Root

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install root, backend, and frontend dependencies |
| `npm run dev` | Run backend + frontend concurrently |
| `npm run dev:backend` | Backend only |
| `npm run dev:frontend` | Frontend only |
| `npm run build` | Build frontend for production |
| `npm run start` | Start backend in production mode |

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API with `node --watch` |
| `npm run start` | Start API (production) |
| `npm run prisma:seed` | Seed database |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `frontend/dist` |
| `npm run preview` | Preview production build |

---

## Troubleshooting

### `ERR_CONNECTION_REFUSED` on login/register

The backend is not running. Start it:

```bash
npm run dev:backend
```

Confirm: http://127.0.0.1:4000/api/health

### `Timed out fetching a new connection from the connection pool`

Usually caused by:

1. **Multiple backend instances** on port 4000 — stop extras:
   ```powershell
   netstat -ano | findstr ":4000" | findstr LISTENING
   taskkill /PID <PID> /F
   ```
2. **Wrong `DATABASE_URL`** — use local Docker Postgres (`127.0.0.1:5432`), not a remote URL.
3. Restart with a single backend: `npm run dev:backend`

### `Port 4000 is already in use`

Another Node process is running. Kill it (see above) and restart.

### OTP email not received

- Verify Gmail App Password in `backend/.env`
- Check spam folder
- Ensure `EMAIL_DEV_MODE=false` for real emails
- Confirm `SMTP_USER` matches the Gmail account that created the App Password

### Docker database not starting

```bash
docker compose down
docker compose up -d
docker ps   # truck-dispatch-db should be "healthy"
```

### Prisma client out of date

```bash
cd backend
npm run prisma:generate
```

---

## Deployment notes

### Full stack (Vercel — frontend + API)

One Vercel project serves the React app and the Express API (`api/index.js` serverless function).

1. Import repo at [vercel.com/new](https://vercel.com/new) (root directory = repo root, not `frontend/`)
2. Add **Environment Variables** (from `backend/.env.example`):

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Strong random secret |
| `CLIENT_ORIGIN` | `https://your-app.vercel.app` |
| `SMTP_*` | Gmail SMTP for OTP emails |
| `VITE_API_URL` | `/api` |
| `VITE_SOCKET_URL` | leave empty (same origin; live GPS uses polling on Vercel) |

3. Deploy — `vercel.json` runs install, Prisma generate, and Vite build automatically.

**CLI:**

```bash
npx vercel
npx vercel --prod
```

**Local dev** still uses `npm run dev` (Express on port 4000 + Vite proxy).

> **Note:** Socket.io realtime is limited on Vercel serverless. REST API, auth, trips, and feedback work fully; the UI refreshes via React Query.

### Backend

Deploy the `backend/` folder to any Node.js host (Railway, Render, Fly.io, VPS, etc.):

1. Set all `backend/.env` variables on the host
2. Use a managed PostgreSQL instance and set `DATABASE_URL`
3. Run `npm run prisma:push` (or migrations) before first start
4. Start with `npm run start`
5. Ensure `CLIENT_ORIGIN` includes your frontend URL

### Security checklist (production)

- [ ] Strong `JWT_SECRET`
- [ ] HTTPS everywhere
- [ ] Restrict `CLIENT_ORIGIN` to your real domain
- [ ] Never commit `.env` or SMTP credentials
- [ ] Use managed PostgreSQL with connection pooling appropriate to your plan

---

## License

Private project — all rights reserved unless otherwise specified by the repository owner.

---

## Author

**Yasin-dev10** — [GitHub](https://github.com/Yasin-dev10/truck-dispa)
