# Truck & Cargo Dispatch Marketplace

Web-based logistics marketplace connecting customers, dispatchers, and driver-truck accounts.

## Project structure

```
truck-dispa/
├── backend/          # Node.js + Express + PostgreSQL API
├── frontend/         # React + Vite + Tailwind UI
├── docker-compose.yml
└── package.json      # Root scripts to run both apps
```

## Stack

- **Frontend:** React + Vite + Tailwind CSS + React Router + Axios + React Hook Form + React Query + Recharts + Socket.io Client
- **Backend:** Node.js + Express + JWT + Socket.io + Multer
- **Database:** PostgreSQL (`pg`)

## Design rule

One **driver account = one truck**. A driver cannot be registered without truck details.

## Quick start

### 1. Start PostgreSQL

```bash
npm run db:up
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Run both apps

```bash
npm run dev
```

- Frontend: http://127.0.0.1:5173
- API: http://127.0.0.1:4000/api/health

### Run separately

```bash
npm run dev:backend
npm run dev:frontend
```

## Demo accounts

Password for all seed users: `Password123!`

| Role | Email |
|------|-------|
| Admin | admin@truckdispatch.local |
| Dispatcher | dispatcher@truckdispatch.local |
| Customer | customer@truckdispatch.local |
| Driver | driver@truckdispatch.local |

## PostgreSQL tables

`users`, `trucks`, `truck_types`, `cargo_requests`, `trips`, `notifications`, `payments`, `settings`, `audit_logs`

Schema auto-applies from `backend/db/schema.sql` on API startup.
