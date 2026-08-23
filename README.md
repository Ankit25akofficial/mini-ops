# 🌐 Mini Operations ERP System

A modern, full-stack Enterprise Resource Planning (ERP) platform built for multi-location warehouse operations, inventory tracking, work order management, internal transfers, and customer sales order fulfillment with atomic stock reservations.

---

## 🚀 Live Production Deployment

* **Portal URL:** [https://mini-ops-xe6j.vercel.app](https://mini-ops-xe6j.vercel.app)
* **Backend API Base:** `https://mini-ops.onrender.com/api`
* **Interactive API Docs (Swagger):** `https://mini-ops.onrender.com/api/docs`

---

## 📚 Complete Technical Documentation

For deep technical details, architectural blueprints, schema specifications, and API guides, explore the documentation suite:

| Document | Description |
| :--- | :--- |
| 🏗️ **[System Architecture & Design Specification](docs/ARCHITECTURE.md)** | Operational workflows, Mermaid sequence diagrams, concurrency lock designs (`SELECT FOR UPDATE`), and location scoping rules. |
| 📖 **[API Documentation Reference](docs/API_DOCUMENTATION.md)** | Complete endpoint dictionary, Zod validation schemas, role permissions matrix, request/response samples, and Postman specs. |
| 🗄️ **[Database Schema & ERD Specification](docs/DATABASE_SCHEMA.md)** | Mermaid ERD diagrams, table definitions, foreign keys, check constraints, and transaction ledger event types. |
| 🚀 **[Deployment & Operations Guide](docs/DEPLOYMENT.md)** | Step-by-step installation for local development, Vercel frontend, Render backend, Neon PostgreSQL cloud, and test suites. |

---

## 🔑 Pre-Seeded Demo Credentials

All passwords are set to the base username followed by `123`.

| Role | Username | Password | Access Scope & Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full access across all locations and modules. |
| **Operations** | `ops` | `ops123` | Assigned to **Location 1**. Can adjust stock, write off damaged items, and dispatch/receive transfers. |
| **Warehouse** | `warehouse` | `warehouse123` | Assigned to **Location 2**. Operations access for secondary depot. |
| **Sales** | `sales` | `sales123` | Create customer sales orders & reserve stock atomically. Inventory/transfers read-only. |
| **Accounts** | `accounts` | `accounts123` | Financial & ledger audit view across operations. |

---

## 📸 Interface Preview

### Dashboard — Real-time Operational Overview
![Dashboard](docs/screenshots/dashboard.png)

### Inventory & Stock Level Management
![Inventory](docs/screenshots/inventory.png)

### Work Orders & Internal Stock Transfers
![Work Orders and Transfers](docs/screenshots/workorders_transfers.png)

---

## 🛠️ Technology Stack

* **Frontend:** React 19, Vite, TypeScript, Styled-Components, Lucide Icons, Axios
* **Backend:** Node.js, Express, TypeScript, Zod Schema Validations, JWT Authentication, PostgreSQL (`pg`)
* **Testing:** Jest + Supertest integration tests
* **Documentation:** Swagger UI (`/api/docs`), Postman Collection (`postman_collection.json`)

---

## ⚙️ Quick Start (Local Setup)

```bash
# 1. Clone repository
git clone https://github.com/Ankit25akofficial/mini-ops.git
cd mini-ops

# 2. Start Backend (runs on port 5000)
cd backend
npm install
npm run seed
npm run dev

# 3. Start Frontend (in a new terminal, runs on port 5173)
cd ../frontend
npm install --legacy-peer-deps
npm run dev
```

* Backend Health Check: [http://localhost:5000/health](http://localhost:5000/health)
* Swagger UI Docs: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
* Frontend App: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Automated Integration Tests

Run the Jest integration suite from `backend/`:
```bash
cd backend
npm run test
```
*Validates role authentication, atomic stock reservations, transfer state locks, partial receipts, and damaged stock write-offs.*
