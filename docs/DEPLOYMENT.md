# 🚀 Deployment & Operations Guide

This guide covers deployment procedures for both local development and cloud production infrastructure.

---

## 🪟 Architecture Environment Matrix

| Component | Technology | Local Environment | Cloud Production |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19 + Vite | `http://localhost:5173` | **Vercel Hosting** (`https://mini-ops-xe6j.vercel.app`) |
| **Backend** | Express + TypeScript | `http://localhost:5000` | **Render Web Service** (`https://mini-ops.onrender.com`) |
| **Database** | PostgreSQL | In-Memory Mock or Local Postgres | **Neon PostgreSQL Cloud** |

---

## 💻 Local Development Setup

### 1. Backend Configuration
```bash
cd backend
npm install
```

Create `.env` file inside `backend/`:
```env
PORT=5000
DATABASE_URL=postgresql://neondb_owner:your_pass@ep-long-dream-ay7npj0n.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=supersecretjwtkeyforelerpcrmoperationsportal2026
JWT_EXPIRES_IN=30d
NODE_ENV=development
USE_MOCK_DB=true
```

> **Note on `USE_MOCK_DB`:**
> Setting `USE_MOCK_DB=true` enables the in-memory database simulator. This allows full offline development, running tests, and UI interaction without requiring local PostgreSQL installation or cloud database network access.

Run database seed & start dev server:
```bash
npm run seed
npm run dev
```

### 2. Frontend Configuration
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

---

## ☁️ Cloud Production Deployment

### 1. Database Setup (Neon PostgreSQL)
1. Log in to [Neon Console](https://console.neon.tech).
2. Create a new PostgreSQL project named `mini-ops-db`.
3. Open the **SQL Editor** tab and execute the full SQL migration script provided in [`production_setup.sql`](../production_setup.sql).
4. Copy the connection string (with `sslmode=require`).

### 2. Backend Deployment (Render)
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Create a new **Web Service** connected to your GitHub repository (`Ankit25akofficial/mini-ops`).
3. Set the following parameters:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
4. Add Environment Variables:
   - `DATABASE_URL` = `<your_neon_db_connection_string>`
   - `JWT_SECRET` = `<secure_random_key>`
   - `NODE_ENV` = `production`
   - `USE_MOCK_DB` = `false`

### 3. Frontend Deployment (Vercel)
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Import the project repository (`Ankit25akofficial/mini-ops`).
3. Set the **Root Directory** to `frontend`.
4. Add Environment Variable:
   - `VITE_API_URL` = `https://mini-ops.onrender.com/api`
5. Deploy. Vercel automatically builds Vite assets and serves the single-page application (SPA) with rewrite rules specified in [`vercel.json`](../vercel.json).

---

## 🧪 Automated Testing & Verification

Execute the integration test suite:
```bash
cd backend
npm run test
```

The test suite validates:
1. **Authentication & Roles:** Rejection of unauthenticated requests and role protection gates (`401`/`403`).
2. **Stock Over-Reservation:** Prevention of orders exceeding available inventory (`physical - reserved`).
3. **Internal Transfers:** Non-increasing destination stock prior to receipt, batch logging on dispatch.
4. **Duplicate Receipt Lock:** Blocking repeated receipt invocations on completed transfers.
5. **Damaged Stock Deductions:** Instant negative write-off entries in ledger.
