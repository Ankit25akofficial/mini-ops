# 📖 API Documentation Reference

The Mini Operations ERP backend exposes a REST API powered by Express.js and TypeScript, validated with Zod schemas, and documented via Swagger UI at `/api/docs`.

---

## 🔑 Authentication Header
All protected endpoints require a valid JWT token passed in the Authorization header:
```http
Authorization: Bearer <your_jwt_token>
```

---

## 🔌 API Endpoints Summary

### 1. Authentication & Session (`/api/auth`)

| Method | Endpoint | Description | Auth Required | Allowed Roles |
| :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/login` | Login with username and password, returns JWT token | ❌ No | Public |
| `POST` | `/api/auth/register` | Register a new user | 🔒 Yes | `ADMIN` |
| `GET` | `/api/auth/me` | Return current authenticated user context & location | 🔒 Yes | `ADMIN`, `OPERATIONS`, `SALES` |

#### `POST /api/auth/login` Example
**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```
**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@erp.com",
    "role": "ADMIN",
    "location_id": null
  }
}
```

---

### 2. Item Catalog (`/api/items`)

| Method | Endpoint | Description | Auth Required | Allowed Roles |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/items` | List all items with category names | 🔒 Yes | `ADMIN`, `OPERATIONS`, `SALES` |
| `GET` | `/api/items/:id` | Get item details by ID | 🔒 Yes | `ADMIN`, `OPERATIONS`, `SALES` |
| `POST` | `/api/items` | Create new item catalog entry | 🔒 Yes | `ADMIN`, `OPERATIONS` |

#### `POST /api/items` Example
**Request Body:**
```json
{
  "name": "Enterprise Laptop L1",
  "sku": "LAPTOP-E1",
  "category_id": 1,
  "price": 1200.00
}
```

---

### 3. Inventory & Ledger Management (`/api/inventory`)

| Method | Endpoint | Description | Auth Required | Allowed Roles |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/inventory` | Get current physical, reserved, and available stock levels | 🔒 Yes | `ADMIN`, `OPERATIONS`, `SALES` |
| `POST` | `/api/inventory/adjust` | Manual stock adjustment or damaged stock write-off | 🔒 Yes | `ADMIN`, `OPERATIONS` |

#### `POST /api/inventory/adjust` Request Body
```json
{
  "item_id": 1,
  "location_id": 1,
  "batch": "BATCH-2026A",
  "quantity": -5,
  "transaction_type": "DAMAGED"
}
```

---

### 4. Work Orders (`/api/work-orders`)

| Method | Endpoint | Description | Auth Required | Allowed Roles |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/work-orders` | List work orders | 🔒 Yes | `ADMIN`, `OPERATIONS` |
| `POST` | `/api/work-orders` | Schedule a new production work order | 🔒 Yes | `ADMIN`, `OPERATIONS` |
| `PUT` | `/api/work-orders/:id/progress` | Advance status (`ASSIGNED` ➔ `IN_PROGRESS` ➔ `COMPLETED`) | 🔒 Yes | `ADMIN`, `OPERATIONS` |

---

### 5. Internal Stock Transfers (`/api/transfers`)

| Method | Endpoint | Description | Auth Required | Allowed Roles |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/transfers` | List internal transfers | 🔒 Yes | `ADMIN`, `OPERATIONS` |
| `POST` | `/api/transfers` | Request internal transfer between locations | 🔒 Yes | `ADMIN`, `OPERATIONS` |
| `POST` | `/api/transfers/:id/dispatch` | Dispatch transfer & deduct source inventory | 🔒 Yes | `ADMIN`, `OPERATIONS` |
| `POST` | `/api/transfers/:id/receive` | Receive transfer & credit destination inventory | 🔒 Yes | `ADMIN`, `OPERATIONS` |

#### `POST /api/transfers/:id/receive` Body (Partial Transfer Support)
```json
{
  "received_quantity": 8
}
```

---

### 6. Customer Sales Orders (`/api/orders`)

| Method | Endpoint | Description | Auth Required | Allowed Roles |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/orders` | List customer sales orders | 🔒 Yes | `ADMIN`, `SALES` |
| `POST` | `/api/orders` | Create order & reserve stock atomically (`SELECT FOR UPDATE`) | 🔒 Yes | `ADMIN`, `SALES` |
| `POST` | `/api/orders/:id/cancel` | Cancel order & release reserved stock back to available pool | 🔒 Yes | `ADMIN`, `SALES` |

---

## ⚡ Error Responses & HTTP Status Codes

| Status Code | Reason | Example Output |
| :--- | :--- | :--- |
| `400 Bad Request` | Zod Validation failure or constraint violation (e.g. insufficient stock) | `{"error": "Insufficient stock available"}` |
| `401 Unauthorized` | Missing or invalid JWT token | `{"error": "Access token required"}` |
| `403 Forbidden` | Authenticated user role lacks permission for endpoint | `{"error": "Forbidden: insufficient permissions"}` |
| `404 Not Found` | Requested resource (item, order, transfer) does not exist | `{"error": "Order not found"}` |
| `500 Internal Error` | Database execution fault or unhandled exception | `{"error": "Internal server error"}` |
