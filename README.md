# 🌐 Mini Operations ERP System


A modern, full-stack Enterprise Resource Planning (ERP) system tailored for warehouse operations, inventory tracking, and order fulfillment. Built with strict role-based controls, transaction-safe inventory tracking, dynamic material shortage calculations, and an interactive frontend portal.

---

## 🚀 Live Demo

**▶ [https://mini-ops-xe6j.vercel.app](https://mini-ops-xe6j.vercel.app)**

| Role | Username | Password | Access |
|:---|:---|:---|:---|
| Admin | `admin` | `admin123` | Full access — all modules |
| Operations | `ops` | `ops123` | Inventory, Work Orders, Transfers |
| Sales | `sales` | `sales123` | Sales Orders only |

---

## 📸 Screenshots

### Dashboard — Operational Overview
![Dashboard](docs/screenshots/dashboard.png)

### Inventory Management
![Inventory](docs/screenshots/inventory.png)

### Work Orders & Internal Transfers
![Work Orders and Transfers](docs/screenshots/workorders_transfers.png)

---



## 🛠️ Technology Stack

* **Frontend:** React 19, Vite, TypeScript, Styled-Components, Lucide Icons, Axios Client
* **Backend:** Node.js, Express, TypeScript, Zod Schema Validations, JWT Authentication, PostgreSQL (`pg`)
* **Testing:** Jest + Supertest
* **API Documentation:** Swagger UI (`/api/docs`)

---

## 📁 Directory Structure

```
├── backend/
│   ├── src/
│   │   ├── config/             # DB, Mock-DB, & Swagger configurations
│   │   ├── controllers/        # Zod-validated request controllers
│   │   ├── db/                 # SQL schemas and seed scripts
│   │   ├── middleware/         # Auth and role verification middlewares
│   │   ├── routes/             # Express API routers
│   │   └── index.ts            # Express server entry point
│   ├── jest.config.js          # Jest configuration
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Navigation layout, loader, banners
│   │   ├── context/            # Auth & Theme context states
│   │   ├── pages/              # ERP screens (Inventory, Work Orders, Transfers, Orders, Dashboard, Login)
│   │   ├── services/           # Axios API client
│   │   └── App.tsx             # Routing guard setup
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## 🔑 Pre-Seeded Demo Credentials

All passwords are set to the base username followed by `123`.

| Username | Password | Role | Permissions |
| :--- | :--- | :--- | :--- |
| **admin** | `admin123` | **ADMIN** | Can schedule Work Orders, view stock, check transfers, register users, and place orders. |
| **ops** | `ops123` | **OPERATIONS** | Can adjust inventory physical counts and request, dispatch, or receive stock transfers. |
| **sales** | `sales123` | **SALES** | Can create customer orders and reserve stock atomically. Inventory and transfers are read-only. |

---

## 🛡️ Business Rules & Safety Locks

1. **Atomic Stock Reservations (SELECT FOR UPDATE):**
   When creating a customer order, the server starts a transaction block (`BEGIN` ... `COMMIT`) and locks inventory rows using `SELECT FOR UPDATE` to check that the available stock (`physical_quantity - reserved_quantity`) is sufficient. If yes, it increments `reserved_quantity` atomically, preventing race conditions when multiple sales reps reserve concurrently.
2. **Double-Receipt Protection on Transfers:**
   Stock transfers are tracked from `REQUESTED` to `DISPATCHED` to `RECEIVED`.
   - On DISPATCH: Source inventory is decremented and the batch name is recorded on the transfer.
   - Before RECEIPT: Destination stock is unchanged.
   - On RECEIPT: Destination inventory increases.
   - A check ensures a transfer can only be received if it is in the `DISPATCHED` status, blocking double-receipt attempts.
3. **Database Constraint Safety:**
   The `inventory` table enforces a check constraint (`physical_quantity >= reserved_quantity`), guaranteeing that available inventory never drops below zero at the database engine level.

---

## ⚙️ Local Installation & Setup

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
   DATABASE_URL=postgresql://your_db_user:your_db_password@localhost:5432/mini_ops_erp?sslmode=disable
   JWT_SECRET=supersecretjwtkeyforelerpcrmoperationsportal2026
   JWT_EXPIRES_IN=30d
   NODE_ENV=development
   USE_MOCK_DB=true
   ```
   *Note: `USE_MOCK_DB=true` bypasses external database network blocks and runs the portal on a robust in-memory database simulator.*
4. Run the database seed script:
   ```bash
   npm run seed
   ```
5. Launch the backend dev server:
   ```bash
   npm run dev
   ```
   * The server runs on **`http://localhost:5000`**. Check **`/health`** to verify.
   * Swagger documentation is available at **`http://localhost:5000/api/docs`**.

### 2. Frontend Setup
1. Enter the frontend folder:
   ```bash
   cd frontend
   ```
2. Install client dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Launch the Vite local dev server:
   ```bash
   npm run dev
   ```
   * Access the portal at **`http://localhost:5173`**.

### 3. Running Automated Tests
1. From the `backend/` root folder:
   ```bash
   npm run test
   ```
   * This executes the Jest integration test suite verifying the 5 mandatory business rules (stock over-reservation checks, transfer over-dispatch locks, transfer receipt stock levels, duplicate receipt prevention, and role-based route authentication).
