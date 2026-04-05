# Finance Dashboard Backend API

A secure, role-based REST API for managing financial records, built with Node.js, Express, and MongoDB. Supports JWT authentication, ACID-compliant operations, and aggregation-based dashboard analytics.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [User Management](#user-management)
  - [Financial Transactions](#financial-transactions)
  - [Dashboard Analytics](#dashboard-analytics)
- [Role-Based Access Control](#role-based-access-control)
- [Error Handling](#error-handling)
- [Security](#security)
- [Assumptions & Tradeoffs](#assumptions--tradeoffs)

---

## Overview

| Capability | Details |
|---|---|
| Authentication | Secure Access (15m) & Refresh Token (7d) Rotation Pattern |
| Authorization | Centralized RBAC Matrix (`Viewer`, `Analyst`, `Admin`) via `config/permissions.js` |
| Financial Records | Full CRUD sorting, filtering, and **Cursor-based Pagination** |
| Analytics | Complex Aggregation Pipelines supported by **Redis Caching** (5m TTL) |
| Data Safety | Soft deletion mechanisms implemented across Users & Transactions |
| Consistency | MongoDB session ACID transactions |
| Validation | Granular dynamic input validation via Joi |
| Security | Strict Origin CORS, Helmet headers, Rate Limiter |
| Testing | Complete Jest + Supertest integration suite mapping all endpoints natively |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js 4.x |
| Database | MongoDB with Mongoose 8.x |
| Caching | Redis (`ioredis`) |
| Authentication | jsonwebtoken & `crypto` native secure hex generators |
| Validation | Joi |
| Testing | Jest, Supertest, `mongodb-memory-server` |
| Security | cors, express-rate-limit, express-mongo-sanitize, helmet |

---

## Project Structure

```
/
├── __tests__/                      # Jest Integration & E2E Test Suite
│
├── config/
│   └── permissions.js              # Centralized RBAC Matrix Definitions
│
├── controllers/
│   ├── auth.controller.js          # Signup, login, refresh, logout
│   ├── transaction.controller.js   # Transaction CRUD + Redis analytics
│   └── user.controller.js          # User CRUD (Admin/Permission based)
│
├── services/
│   ├── transaction.service.js      # Business logic & aggregation pipelines
│   └── user.service.js             # User data access layer
│
├── models/
│   ├── refreshToken.model.js       # Refresh token persistence schema
│   ├── transaction.model.js        # Transaction schema (compound query indexes)
│   └── user.model.js               # User schema
│
├── routes/
│   ├── auth.routes.js
│   ├── transaction.routes.js
│   └── user.routes.js
│
├── middlewares/
│   ├── auth.middleware.js          # protect routes
│   ├── error.middleware.js         # Global error handler
│   └── rbac.middleware.js          # Unified Action-based restrict enforcement
│
├── utils/
│   ├── apiFeatures.js              # Cursor Pagination & Query filters
│   ├── appError.js                 # Custom operational error
│   ├── cache.js                    # Redis graceful fallback wrapper
│   ├── catchAsync.js               # Async error wrapper
│   ├── redisClient.js              # ioredis connection initialization 
│   └── validation.js               # Joi object schemas
│
├── .env
├── jest.config.js                  # Jest ECMAScript modules configuration
├── package.json
└── server.js                       # Server entry point
```

**Request flow:**

```
Request → Route → Middleware (Auth + RBAC) → Controller → Service → MongoDB
                                                                        |
Response ←─────────────────────────────────── Controller ←── Service ──┘
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB — either [MongoDB Atlas](https://www.mongodb.com/atlas) (recommended) or a local Replica Set instance

### Installation

```bash
# Clone and install
git clone <repository-url>
cd <project-folder>
npm install

# Configure environment
# Create a .env file — see Environment Variables section below

# Start development server
npm run dev
```

### Scripts

```bash
npm run dev    # Start with nodemon (hot reload)
npm start      # Start with node
npm test       # Run the Jest automated integration test suite natively
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/finance-dashboard
REDIS_URL=redis://127.0.0.1:6379
ALLOWED_ORIGINS=http://localhost:5173

JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
```

> **Note:** The application uses **Graceful Degradation** for Redis. If a Redis URL isn't configured or the Redis server goes down unexpectedly, the system will seamlessly fall back to executing standard isolated MongoDB aggregations instead of crashing.

---

## API Reference

**Base URL:** `http://localhost:3000/api/v1`

All protected routes require one of:
- Header: `Authorization: Bearer <token>`
- Cookie: `jwt=<token>` (set automatically on login/signup)

---

## Authentication

### `POST /api/v1/auth/signup`

Register a new user account.

**Access:** Public

**Request Body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | String | Yes | Non-empty |
| `email` | String | Yes | Valid email |
| `password` | String | Yes | Min 6 characters |
| `role` | String | No | `Admin`, `Analyst`, or `Viewer` — defaults to `Viewer` |

```json
{
  "name": "Nitesh Mourya",
  "email": "nitesh@example.com",
  "password": "secure123",
  "role": "Admin"
}
```

**Response — `201 Created`**

```json
{
  "status": "success",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "6612a3f5c8e1a4b5d9f00001",
      "name": "Nitesh Mourya",
      "email": "nitesh@example.com",
      "role": "Admin",
      "createdAt": "2026-04-05T09:00:00.000Z",
      "updatedAt": "2026-04-05T09:00:00.000Z"
    }
  }
}
```

**Error Responses**

| Status | Scenario |
|---|---|
| `400` | Missing/invalid fields — e.g. `"email" must be a valid email` |
| `400` | Email already registered — `Email is already registered. Please login instead.` |

---

### `POST /api/v1/auth/login`

Authenticate and receive a JWT token.

**Access:** Public

**Request Body**

| Field | Type | Required |
|---|---|---|
| `email` | String | Yes |
| `password` | String | Yes |

```json
{
  "email": "nitesh@example.com",
  "password": "secure123"
}
```

**Response — `200 OK`**

```json
{
  "status": "success",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "6612a3f5c8e1a4b5d9f00001",
      "name": "Nitesh Mourya",
      "email": "nitesh@example.com",
      "role": "Admin",
      "createdAt": "2026-04-05T09:00:00.000Z",
      "updatedAt": "2026-04-05T09:00:00.000Z"
    }
  }
}
```

**Error Responses**

| Status | Scenario |
|---|---|
| `400` | Email or password missing — `Please provide email and password!` |
| `401` | Wrong credentials — `Incorrect email or password` |

---

### `POST /api/v1/auth/refresh`

Rotates your session token by returning a newly minted `accessToken` and replacing the `refreshToken` inside your cookie. This enforces strong security constraints natively.

**Access:** Public (Requires an active `refreshToken` to be passed via HTTP-Only Cookies natively).

**Response — `200 OK`**

```json
{
  "status": "success",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "6612a3f5c8e1a4b5d9f00001",
      "name": "Nitesh Mourya",
      "email": "nitesh@example.com",
      "role": "Admin"
    }
  }
}
```

**Error Responses**

| Status | Scenario |
|---|---|
| `401` | Token missing or expired — `Invalid or expired refresh token. Please login again.` |

---

### `GET /api/v1/auth/logout`

Clears the JWT cookie by overwriting it with an expired placeholder.

**Access:** Public

**Response — `200 OK`**

```json
{
  "status": "success"
}
```

---

## User Management

> All user management endpoints require **Admin** role.

---

### `GET /api/v1/users`

Returns all active users. Soft-deleted users (`active: false`) are excluded.

**Response — `200 OK`**

```json
{
  "status": "success",
  "results": 2,
  "data": {
    "users": [
      {
        "_id": "6612a3f5c8e1a4b5d9f00001",
        "name": "Nitesh Mourya",
        "email": "nitesh@example.com",
        "role": "Admin",
        "createdAt": "2026-04-05T09:00:00.000Z",
        "updatedAt": "2026-04-05T09:00:00.000Z"
      },
      {
        "_id": "6612a3f5c8e1a4b5d9f00002",
        "name": "Priya Sharma",
        "email": "priya@example.com",
        "role": "Analyst",
        "createdAt": "2026-04-05T10:00:00.000Z",
        "updatedAt": "2026-04-05T10:00:00.000Z"
      }
    ]
  }
}
```

---

### `GET /api/v1/users/:id`

Retrieve a single user by MongoDB ObjectId.

**Response — `200 OK`**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "6612a3f5c8e1a4b5d9f00001",
      "name": "Nitesh Mourya",
      "email": "nitesh@example.com",
      "role": "Admin",
      "createdAt": "2026-04-05T09:00:00.000Z",
      "updatedAt": "2026-04-05T09:00:00.000Z"
    }
  }
}
```

**Error Responses**

| Status | Scenario |
|---|---|
| `400` | Invalid ObjectId format |
| `404` | User not found |

---

### `POST /api/v1/users`

Admin-provisioned user creation (bypasses the self-signup flow).

**Request Body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | String | Yes | Non-empty |
| `email` | String | Yes | Valid email |
| `password` | String | Yes | Min 6 characters |
| `role` | String | No | `Admin`, `Analyst`, or `Viewer` — defaults to `Viewer` |

```json
{
  "name": "Raj Kumar",
  "email": "raj@example.com",
  "password": "pass123",
  "role": "Viewer"
}
```

**Response — `201 Created`**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "6612a3f5c8e1a4b5d9f00003",
      "name": "Raj Kumar",
      "email": "raj@example.com",
      "role": "Viewer",
      "createdAt": "2026-04-05T11:00:00.000Z",
      "updatedAt": "2026-04-05T11:00:00.000Z"
    }
  }
}
```

**Error Responses**

| Status | Scenario |
|---|---|
| `400` | Validation failure |
| `400` | Duplicate email |
| `403` | Caller is not an Admin |

---

### `PATCH /api/v1/users/:id`

Update a user's name, email, or role. Password updates are not allowed on this route.

**Request Body** *(all fields optional)*

```json
{
  "name": "Raj Kumar Updated",
  "role": "Analyst"
}
```

**Response — `200 OK`**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "6612a3f5c8e1a4b5d9f00003",
      "name": "Raj Kumar Updated",
      "email": "raj@example.com",
      "role": "Analyst",
      "createdAt": "2026-04-05T11:00:00.000Z",
      "updatedAt": "2026-04-05T12:00:00.000Z"
    }
  }
}
```

**Error Responses**

| Status | Scenario |
|---|---|
| `400` | Password field sent — `This route is not for password updates.` |
| `404` | User not found |

---

### `DELETE /api/v1/users/:id`

Soft-deletes a user by setting `active: false`. The record is retained for audit purposes and excluded from future queries.

**Response — `204 No Content`** *(empty body)*

**Error Responses**

| Status | Scenario |
|---|---|
| `404` | User not found |

---

## Financial Transactions

> All transaction endpoints require authentication. See the [RBAC table](#role-based-access-control) for per-role permissions.

---

### `GET /api/v1/transactions`

List transactions. Admins and Analysts see all records. Viewers see only their own.

**Query Parameters**

| Parameter | Example | Description |
|---|---|---|
| `type` | `?type=income` | Filter by `income` or `expense` |
| `category` | `?category=Salary` | Filter by category name |
| `date[gte]` | `?date[gte]=2026-01-01` | Transactions on or after date |
| `date[lte]` | `?date[lte]=2026-04-30` | Transactions on or before date |
| `sort` | `?sort=-amount` | Sort field (prefix `-` for descending) |
| `limit` | `?limit=10` | Results to return (defaults to all) |
| `cursor` | `?cursor=eyJhb...` | A base64-encoded Object ID cursor provided via previous queries to fast-paginate forward. |

**Example**

```
GET /api/v1/transactions?type=expense&sort=-date&limit=5&page=1
```

**Response — `200 OK`**

```json
{
  "status": "success",
  "results": 2,
  "data": {
    "transactions": [
      {
        "_id": "6612b1f5c8e1a4b5d9f00010",
        "amount": 3000,
        "type": "expense",
        "category": "Rent",
        "date": "2026-04-01T00:00:00.000Z",
        "notes": "April office rent",
        "user": "6612a3f5c8e1a4b5d9f00001",
        "createdAt": "2026-04-01T10:00:00.000Z",
        "updatedAt": "2026-04-01T10:00:00.000Z"
      },
      {
        "_id": "6612b1f5c8e1a4b5d9f00011",
        "amount": 800,
        "type": "expense",
        "category": "Utilities",
        "date": "2026-04-03T00:00:00.000Z",
        "notes": "Electricity bill",
        "user": "6612a3f5c8e1a4b5d9f00001",
        "createdAt": "2026-04-03T09:00:00.000Z",
        "updatedAt": "2026-04-03T09:00:00.000Z"
      }
    ],
    "nextCursor": "eyIuaWQiOiI2NjEyYjFmNWM4ZTFhNGI1ZDlmMDAwMTEifQ=="
  }
}
```

---

### `POST /api/v1/transactions`

Create a new financial record.

**Access:** Admin only

**Request Body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `amount` | Number | Yes | Positive number |
| `type` | String | Yes | `income` or `expense` |
| `category` | String | Yes | Non-empty string |
| `date` | String | No | ISO 8601 format — defaults to current date |
| `notes` | String | No | Max 500 characters |

```json
{
  "amount": 12000,
  "type": "income",
  "category": "Salary",
  "date": "2026-04-01",
  "notes": "Monthly salary for April 2026"
}
```

**Response — `201 Created`**

```json
{
  "status": "success",
  "data": {
    "transaction": {
      "_id": "6612b1f5c8e1a4b5d9f00012",
      "amount": 12000,
      "type": "income",
      "category": "Salary",
      "date": "2026-04-01T00:00:00.000Z",
      "notes": "Monthly salary for April 2026",
      "user": "6612a3f5c8e1a4b5d9f00001",
      "createdAt": "2026-04-05T11:30:00.000Z",
      "updatedAt": "2026-04-05T11:30:00.000Z"
    }
  }
}
```

**Error Responses**

| Status | Scenario |
|---|---|
| `400` | `"amount" must be a positive number` |
| `400` | `"type" must be one of [income, expense]` |
| `403` | `Only Admins can create records` |

---

### `GET /api/v1/transactions/:id`

Retrieve a single transaction by ID. Viewers can only access records they own.

**Response — `200 OK`**

```json
{
  "status": "success",
  "data": {
    "transaction": {
      "_id": "6612b1f5c8e1a4b5d9f00012",
      "amount": 12000,
      "type": "income",
      "category": "Salary",
      "date": "2026-04-01T00:00:00.000Z",
      "notes": "Monthly salary for April 2026",
      "user": "6612a3f5c8e1a4b5d9f00001",
      "createdAt": "2026-04-05T11:30:00.000Z",
      "updatedAt": "2026-04-05T11:30:00.000Z"
    }
  }
}
```

**Error Responses**

| Status | Scenario |
|---|---|
| `400` | Invalid ObjectId format |
| `403` | Viewer accessing another user's record |
| `404` | Transaction not found |

---

### `PATCH /api/v1/transactions/:id`

Update fields of an existing transaction.

**Access:** Admin only

**Request Body** *(all fields optional)*

```json
{
  "amount": 13500,
  "notes": "Revised salary — includes bonus"
}
```

**Response — `200 OK`**

```json
{
  "status": "success",
  "data": {
    "transaction": {
      "_id": "6612b1f5c8e1a4b5d9f00012",
      "amount": 13500,
      "type": "income",
      "category": "Salary",
      "date": "2026-04-01T00:00:00.000Z",
      "notes": "Revised salary — includes bonus",
      "user": "6612a3f5c8e1a4b5d9f00001",
      "createdAt": "2026-04-05T11:30:00.000Z",
      "updatedAt": "2026-04-05T12:15:00.000Z"
    }
  }
}
```

**Error Responses**

| Status | Scenario |
|---|---|
| `403` | `Only Admins can update records` |
| `404` | Transaction not found |

---

### `DELETE /api/v1/transactions/:id`

Soft-deletes a transaction by setting `isDeleted: true`. The record is hidden from all queries but preserved in the database.

**Access:** Admin only

**Response — `204 No Content`** *(empty body)*

**Error Responses**

| Status | Scenario |
|---|---|
| `403` | `You do not have permission to delete this transaction` |
| `404` | Transaction not found |

---

## Dashboard Analytics

### `GET /api/v1/transactions/analytics`

Returns aggregated financial data computed entirely via MongoDB aggregation pipelines.

**Access:** Admin and Analyst only

**Response — `200 OK`**

```json
{
  "status": "success",
  "data": {
    "analytics": {
      "overview": {
        "totalIncome": 27000,
        "totalExpense": 8500,
        "netBalance": 18500
      },
      "categoryBreakdown": [
        { "category": "Salary", "type": "income", "totalAmount": 24000 },
        { "category": "Freelance", "type": "income", "totalAmount": 3000 },
        { "category": "Rent", "type": "expense", "totalAmount": 6000 },
        { "category": "Utilities", "type": "expense", "totalAmount": 2500 }
      ],
      "recentActivity": [
        {
          "_id": "6612b1f5c8e1a4b5d9f00015",
          "amount": 3000,
          "type": "income",
          "category": "Freelance",
          "notes": "Website project payment",
          "date": "2026-04-05T00:00:00.000Z",
          "createdAt": "2026-04-05T14:00:00.000Z",
          "createdBy": "Nitesh Mourya"
        },
        {
          "_id": "6612b1f5c8e1a4b5d9f00014",
          "amount": 800,
          "type": "expense",
          "category": "Utilities",
          "notes": "Internet bill",
          "date": "2026-04-04T00:00:00.000Z",
          "createdAt": "2026-04-04T09:00:00.000Z",
          "createdBy": "Nitesh Mourya"
        }
      ],
      "monthlyTrends": [
        {
          "year": 2026,
          "month": 2,
          "totalIncome": 12000,
          "totalExpense": 4000,
          "netBalance": 8000,
          "count": 5
        },
        {
          "year": 2026,
          "month": 3,
          "totalIncome": 12000,
          "totalExpense": 3800,
          "netBalance": 8200,
          "count": 6
        },
        {
          "year": 2026,
          "month": 4,
          "totalIncome": 3000,
          "totalExpense": 700,
          "netBalance": 2300,
          "count": 2
        }
      ]
    }
  }
}
```

**Response Fields**

| Field | Description |
|---|---|
| `overview.totalIncome` | Sum of all `income` transactions |
| `overview.totalExpense` | Sum of all `expense` transactions |
| `overview.netBalance` | `totalIncome - totalExpense` |
| `categoryBreakdown` | Per-category totals sorted by amount descending |
| `recentActivity` | Last 5 non-deleted transactions with creator name |
| `monthlyTrends` | Income vs expense grouped by year-month, sorted chronologically |

**Error Responses**

| Status | Scenario |
|---|---|
| `403` | Viewer role — `You do not have permission to perform this action` |

---

## Role-Based Access Control

### Permissions Matrix

| Endpoint | Admin | Analyst | Viewer |
|---|:---:|:---:|:---:|
| `POST /auth/signup` | Yes | Yes | Yes |
| `POST /auth/login` | Yes | Yes | Yes |
| `GET /auth/logout` | Yes | Yes | Yes |
| `GET /users` | Yes | No | No |
| `POST /users` | Yes | No | No |
| `GET /users/:id` | Yes | No | No |
| `PATCH /users/:id` | Yes | No | No |
| `DELETE /users/:id` | Yes | No | No |
| `GET /transactions` | All records | All records | Own only |
| `POST /transactions` | Yes | No | No |
| `GET /transactions/:id` | Yes | Yes | Own only |
| `PATCH /transactions/:id` | Yes | No | No |
| `DELETE /transactions/:id` | Yes | No | No |
| `GET /transactions/analytics` | Yes | Yes | No |

### How Enforcement Works

- **`config/permissions.js`** — Predefines explicit abilities (e.g. `transaction:create = ['Admin']`).
- **`protect` middleware** — Verifies JWT authenticity dynamically and securely binds the user profile tracking `req.user`.
- **`checkPermission('resource:action')` middleware** — Examines if the active `req.user.role` matches the authorization array defined in your RBAC configurations matrix sequentially before triggering the backend services logic avoiding static hardcoding limitations drastically safely!
- **Controller-level scoping** — For `Viewer` role, explicit ownership filters logically append boundaries binding returned aggregate datasets solely to that target user via database queries directly preventing access crossovers statically.

---

## Error Handling

All error responses follow a consistent structure:

```json
{
  "status": "fail",
  "message": "Human-readable description of what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `204` | No Content (successful delete) |
| `400` | Bad Request — validation, duplicate key, invalid ID |
| `401` | Unauthorized — missing, invalid, or expired token |
| `403` | Forbidden — insufficient role |
| `404` | Not Found |
| `429` | Too Many Requests — rate limit exceeded |
| `500` | Internal Server Error |

### Handled Error Types

| Error Type | HTTP Code | Triggered When |
|---|---|---|
| `CastError` | `400` | Invalid MongoDB ObjectId passed as URL param |
| `E11000 Duplicate Key` | `400` | Duplicate email on signup |
| `ValidationError` | `400` | Mongoose schema validation fails |
| `JsonWebTokenError` | `401` | Token is malformed or tampered |
| `TokenExpiredError` | `401` | JWT has passed its expiry date |
| Operational `AppError` | Varies | Application-level errors thrown via `next(new AppError(...))` |

> In `development` mode, full stack traces are included in responses. In `production` mode, only the message is returned and unknown errors respond with `Something went very wrong!` to prevent information leakage.

---

## Security

| Mechanism | Implementation | Protection Against |
|---|---|---|
| JWT Auth | `jsonwebtoken` | Unauthenticated access |
| HTTP-only Cookies | `httpOnly: true` flag | XSS token theft |
| Secure Cookies | Enabled in production | HTTP interception |
| Password Hashing | `bcrypt` with 12 rounds | Plaintext exposure on DB breach |
| Rate Limiting | 100 requests/hour per IP | Brute force and DoS attacks |
| Security Headers | `helmet` | Clickjacking, MIME sniffing, etc. |
| NoSQL Injection | `express-mongo-sanitize` | Operator injection via `$` and `.` |
| Body Size Cap | `express.json({ limit: '10kb' })` | Oversized payload attacks |
| Error Sanitization | Custom error handler | Stack trace exposure in production |

---

## Assumptions & Tradeoffs

**1. Role field on signup**
The `role` field is accepted in the signup payload to allow evaluators to create Admin or Analyst accounts without database seeding. In a production system, role assignment would be handled by a dedicated admin-controlled endpoint.

**2. MongoDB Replica Set requirement**
Mongoose sessions (`mongoose.startSession()`) require MongoDB to be configured as a Replica Set. MongoDB Atlas supports this out of the box. For local development, either use Atlas or run a local single-node Replica Set with `--replSet`.

**3. Soft deletion**
Transactions are flagged as `isDeleted: true` and users are flagged as `active: false`. Records are never physically removed, preserving audit trails. Mongoose `pre(/^find/)` hooks automatically exclude these records. Aggregation pipelines include an explicit `$match: { isDeleted: { $ne: true } }` filter since hooks do not apply to aggregation calls.

**4. Viewer scoping at controller level**
Viewer data access restrictions are enforced in the controller rather than purely in middleware. This allows fine-grained per-record ownership checks on single-document endpoints that middleware alone cannot cleanly handle.

**5. Pagination defaults**
If no `?limit=` query parameter is provided, responses return up to 100 records per page. This prevents unbounded result sets without requiring mandatory pagination parameters.

**6. Notes field**
The `notes` field is optional on all transactions and accepts up to 500 characters. It is intended for payment references, invoice numbers, or any free-text description associated with a record.

---

*Finance Data Processing and Access Control Backend — Zorvyn FinTech Internship Assignment*
