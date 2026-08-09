# 🌐 Mini Operations Portal

A modern, full-stack Enterprise Resource Planning (ERP) and Customer Relationship Management (CRM) portal tailored for wholesale, warehousing, and distribution operations. Engineered with high-performance frameworks, customized design variables, role-based controls, and transaction-safe inventory tracking.

---

## 🚀 Core Features

### 🔒 Secure Role-Based Access Control (RBAC)
* Seamlessly implements user authentication using JSON Web Tokens (JWT) stored in LocalStorage.
* Restricts views and controls based on **Admin**, **Sales**, **Warehouse**, or **Accounts** permissions.
* Built-in security middlewares intercept API requests on the backend to validate role authorizations.

### 🐒 Animated Monkey Login Screen
* Custom-themed interactive SVG login container.
* Triggers state-bound hands animations that slide up to cover the eyes when the password input is focused/hidden.
* Implements responsive, secure password toggling matching WebKit and Firefox specifications.

### 💬 Customer CRM & Follow-Up Interaction Logs
* Create, list, edit, and filter customer records across **Retail**, **Wholesale**, and **Distributor** accounts.
* Log chronologically sorted follow-up interaction entries (calls, meetings, feedback) linked to the managing representative's user account.

### 📦 Real-Time Inventory & Stock Movement Logging
* Monitor live stock numbers, map warehouse shelving positions (aisles), and manage minimum stock alerts.
* Every single stock adjustment is logged in chronological **IN / OUT** stock movement ledger records.

### 🧾 Transactional Sales Challan System
* Compose delivery challans with multiple line items, displaying dynamic price updates.
* **Price Snapshotting:** Records the product's unit price at the *exact moment* the challan is created to prevent historical updates from skewing past records.
* Generates sequential unique identifiers automatically (e.g., `CH-20260809-0001`).

### 🛡️ Zod-Powered Form Validations
* Inputs are validated against strict schemas before dispatch.
* Modals display field-specific helper alerts (e.g., `Address: Address must be at least 5 characters`) rather than generic validation failures.

### ⚡ Double-Database Failover Protection
* Connects to a cloud-hosted Neon PostgreSQL database in production.
* If outbound database traffic (port `5432`) is blocked by network environments, it transparently falls back to an **in-memory database simulator** with zero downtime or user disruption.

---

## 🛠️ Technology Stack

* **Frontend:** React 19, Vite, TypeScript, Styled-Components, Lucide Icons, Axios Client
* **Backend:** Node.js, Express, TypeScript, Zod Schema Validations, JWT Authentication, PostgreSQL (`pg`)
* **Deployments:** Render (Backend API), Vercel (Frontend Web Portal), Neon (Serverless PostgreSQL)

---

## 📁 Directory Structure

```
├── backend/
│   ├── src/
│   │   ├── config/             # DB & Mock-DB configurations
│   │   ├── controllers/        # Express request handlers
│   │   ├── db/                 # SQL schemas and seed scripts
│   │   ├── middleware/         # Auth, role-checks, and validation wrappers
│   │   ├── routes/             # Express API routing routes
│   │   └── index.ts            # Server entrypoint
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Common UI components (Loader, etc.)
│   │   ├── context/            # Auth & session React context
│   │   ├── pages/              # Portal view pages (Dashboard, CRM, Inventory, etc.)
│   │   ├── services/           # Axios API services
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── postman_collection.json     # Postman collection for API testing
└── README.md
```

---

## 🔑 Pre-Seeded Demo Credentials

All passwords are set to the base username followed by `123`.

| Username | Password | Role | System Permissions |
| :--- | :--- | :--- | :--- |
| **admin** | `admin123` | **Admin** | Full system access to all routes, metrics, and actions. |
| **sales** | `sales123` | **Sales** | Can manage CRM and compose Challans. Inventory is read-only. |
| **warehouse** | `warehouse123` | **Warehouse** | Full access to inventory, locations, and movements. CRM is read-only. |
| **accounts** | `accounts123` | **Accounts** | View CRM/Inventory. Authorized to confirm Draft challans. |

---

## ⚙️ Local Installation & Setup

### Prerequisites
* Node.js (v18.0.0 or higher)
* npm (v9.0.0 or higher)

### 1. Backend Server Setup
1. Enter the backend folder:
   ```bash
   cd backend
   ```
2. Install server-side dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` root directory:
   ```env
    PORT=5000
    DATABASE_URL=postgresql://your_db_username:your_db_password@your_db_host/your_db_name?sslmode=require
    JWT_SECRET=your_jwt_signing_secret_key
    JWT_EXPIRES_IN=30d
    NODE_ENV=development
    USE_MOCK_DB=true
   ```
   * *Note: `USE_MOCK_DB=true` bypasses external DB connection timeouts for instant local development in mock mode.*
4. Initialize the seed database script:
   ```bash
   npm run seed
   ```
5. Launch the backend dev server:
   ```bash
   npm run dev
   ```
   * The server runs on **`http://localhost:5000`**. Check **`/health`** to verify.

### 2. Frontend Portal Setup
1. Open a new terminal window and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install client dependencies (use legacy peer flags for React 19 compatibility):
   ```bash
   npm install --legacy-peer-deps
   ```
3. Create a `.env` file in the `frontend/` root directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
4. Start the Vite React local server:
   ```bash
   npm run dev
   ```
   * Open **`http://localhost:5173`** in your browser to access the portal.

---

## 🛡️ Business Rules & Safe Locks

1. **Anti-Race Condition Stock Deductions:**
   Stock checks and allocations are wrapped in SQL transaction blocks (`BEGIN` ... `COMMIT`/`ROLLBACK`) using `SELECT FOR UPDATE` to lock product inventory rows during dispatch, preventing double-allocations.
2. **Negative Inventory Prevention:**
   The server prevents stock levels from dropping below zero. Out-of-stock requests return a clean `400 Bad Request` block.
3. **Sequential Challan Generation:**
   Confirms automatic counter generation mapping date prefixes (e.g. `CH-20260809-0001`).
