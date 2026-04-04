<<<<<<< HEAD
# Finance Dashboard API Backend 📊

A highly scalable, secure, and fully functional Node.js/Express backend API for a Finance Dashboard platform. It manages robust user authentication, complex Role-Based Access Control (RBAC), and ACID-compliant transaction persistence using MongoDB aggregation pipelines for efficient data abstraction.

## ✨ Features

- **ACID Compliant:** Create, Update, and Delete operations utilize robust MongoDB sessions and transaction locking to ensure atomic consistency.
- **Enterprise-ready RBAC:** Granular route protection defining strict boundaries between `Admin`, `Analyst`, and `Viewer` accounts.
- **Advanced Data Aggregation:** Summary endpoints that compute net balances, compute category distributions, and process activity trends natively on the database layer.
- **Soft Deletion Mechanism:** Safe removal algorithms across `User` and `Transaction` boundaries. Data isn't permanently pruned, retaining auditing capability.
- **Fortified Security:** Built-in safeguards including dynamic Rate Limiting, HTTP Helmet Headers, NoSQL Injection filtering, JWT Stateless cookies, and global error handling interceptors.

## 🏗️ Architecture & Structure

The codebase follows an evolved MVC (Model-View-Controller) structure incorporating a dedicated **Service Layer**:

```text
/backend
├── controllers/    # API Request & Logic orchestrators
├── models/         # Mongoose ODM schemas
├── services/       # Database pipelines & core business handlers (ACID)
├── routes/         # Express routing mechanisms
├── middlewares/    # Authentication, Role checks, and Error boundary nets
├── utils/          # Helpers (API Features, Validation, Custom Errors)
└── server.js       # Central Application Entrypoint
```

## ⚙️ Assumptions & Tradeoffs

1. **Sessions / ACID Simulation:** To fulfill true logical atomicity, we establish `mongoose.startSession()`. **Note:** For Mongoose transactions to successfully commit in MongoDB, your environment must be deployed as a Replica Set (e.g., MongoDB Atlas).
2. **Simplified Registration Setup:** For assignment testing purposes, the `signup` route accepts a `role` override directly in the payload so evaluators can instantly create Admin/Analyst accounts without requiring database seeding. In robust real-world platforms, roles are typically provisioned separately.
3. **Paging/Filtering:** Pagination operations utilize the `APIFeatures` util class globally across list handlers natively translating query parameters `?sort=date&limit=10` into chained Mongoose functions.
4. **Soft Deletions:** Deleting a transaction flags it as `isDeleted: true`. We avoid filtering these within the Mongoose aggregation directly utilizing hooks but rather manually invoke `$match: { isDeleted: { $ne: true } }` allowing pure memory pipeline efficiency.

## 🚀 Setup & Execution

1. Ensure your MongoDB instance (or Atlas cluster) is active.
2. Initialize environment parameters. Ensure you have an established `.env` in the root:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/finance-dashboard

JWT_SECRET=your_super_secret_jwt_key_here_make_it_long
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90
```

3. Install npm module dependencies:

```bash
npm install
```

4. Run locally:

```bash
npm run dev
# OR
npm start
```

---

## 📖 API Documentation & Endpoints

### 🔐 Authentication (`/api/v1/auth`)

_Stateless JWT based system that generates safe HTTP-only cookies._

- `POST /signup` - Register a fresh account. (Payload: `name`, `email`, `password`, `role`)
- `POST /login` - Sign into the platform. (Payload: `email`, `password`)
- `GET /logout` - Exterminate the active browser cookie safely.

### 👤 User Management (`/api/v1/users`)

_Locked exclusively to Accounts with `Admin` privileges._

- `GET /` - Yields list of active users.
- `POST /` - Provision a new user.
- `GET /:id` - Retrieve individual profile mapping.
- `PATCH /:id` - Mutate role or generic account traits.
- `DELETE /:id` - Soft bans the identified user (`active: false`).

### 💵 Financial Transactions (`/api/v1/transactions`)

**RBAC Mappings:**

- **Admin**: Has ultimate CRUD control (_Create, Read, Update, Delete_).
- **Analyst**: Has widespread global `GET` capability and Analytics dashboard access.
- **Viewer**: Read-only constrained limits. Relegated exclusively to viewing their inherently owned personal inputs.

**Endpoints:**

- `GET /` - Fetch transaction lists. Supports `?sort=...`, `?limit=...`, `?page=...` filters.
- `POST /` - **(Admin Only)** Dispatch new transaction records.
  _Payload:_ `{ "amount": 550, "type": "income", "category": "Salary" }`
- `PATCH /:id` - **(Admin Only)** Edit pre-existing rows.
- `DELETE /:id` - **(Admin Only)** Soft-delete records cleanly (Transactions occur logically mapping safely into MongoDB sessions).
- `GET /analytics` - **(Admin / Analyst)** Outputs heavily structured financial calculations via Aggregation computation isolating totals, category breakdowns, and net balances dynamically bypassing normal queries.
=======
# Zorvyn_Assignment
>>>>>>> 369bdf957e591c8bd484f079d1d2191a60fc0bde
