# ReproServe — Node.js Backend

Backend service for **ReproServe** with JWT-based registration and login. A single `users` table holds every account; the `role` column (`user` | `service_provider` | `realtor`) distinguishes the three account types. Role-specific columns are nullable so each row only fills what applies.

- **User** — request services, upload images, compare bids, attend open houses, send messages
- **Service Provider** — create business profile, browse quotes, submit bids, manage leads
- **Realtor** — create open house listings, upload property media, manage attendees and showings

Built with **Node.js + Express + Sequelize (MySQL) + JWT**.

---

## Project structure

```
reproserve-nodejs/
├── index.js                        # entry point — DB connect + sequelize.sync({ alter: true })
├── package.json
├── .env                            # environment variables (DB password = mithuN)
├── config/
│   ├── db.config.js                # MySQL connection settings
│   └── auth.config.js              # JWT secret + expiry
├── models/
│   ├── index.js                    # Sequelize instance + model loader
│   └── user.model.js               # single users table with role enum
├── controllers/
│   └── auth.controller.js          # register, login, me
├── middleware/
│   ├── auth.middleware.js          # verifyToken, requireRole
│   └── validate.middleware.js      # input validation
└── routes/
    ├── index.js
    └── auth.routes.js
```

## Setup

```bash
cd reproserve-nodejs
npm install
```

Make sure MySQL is running and create the DB once:

```sql
CREATE DATABASE reproserve;
```

The default credentials in `.env` are:

```
DB_USER=root
DB_PASSWORD=mithuN
DB_NAME=reproserve
```

## Run

```bash
npm start         # production
npm run dev       # nodemon
```

On startup the server runs `sequelize.sync({ alter: true })`, which auto-creates/updates the `users` table to match the model. Any field added or changed in `user.model.js` is reflected on next start.

---

## Database schema (single `users` table)

| Column            | Type           | Notes                                         |
|-------------------|----------------|-----------------------------------------------|
| id                | INT PK         | auto-increment                                |
| role              | ENUM           | `user` / `service_provider` / `realtor`       |
| fullName          | STRING(150)    | required                                      |
| email             | STRING(150)    | required, **unique**                          |
| password          | STRING(255)    | bcrypt hash                                   |
| phone             | STRING(20)     | nullable                                      |
| profileImage      | STRING(255)    | nullable                                      |
| address           | STRING(255)    | nullable (User)                               |
| city              | STRING(100)    | nullable (User / Realtor)                     |
| state             | STRING(100)    | nullable (User / Realtor)                     |
| zipCode           | STRING(20)     | nullable (User / Realtor)                     |
| businessName      | STRING(150)    | nullable (Service Provider — required)        |
| businessLicense   | STRING(100)    | nullable (Service Provider)                   |
| serviceCategory   | STRING(100)    | nullable (Service Provider)                   |
| serviceArea       | STRING(255)    | nullable (Service Provider)                   |
| description       | TEXT           | nullable (Service Provider)                   |
| logo              | STRING(255)    | nullable (Service Provider)                   |
| rating            | FLOAT          | nullable (Service Provider, default 0)        |
| licenseNumber     | STRING(100)    | nullable (Realtor — required)                 |
| agencyName        | STRING(150)    | nullable (Realtor)                            |
| agencyAddress     | STRING(255)    | nullable (Realtor)                            |
| yearsOfExperience | INT            | nullable (Service Provider / Realtor)         |
| isVerified        | BOOLEAN        | default false                                 |
| isActive          | BOOLEAN        | default true                                  |
| createdAt / updatedAt | timestamps |                                               |

---

## API endpoints

Base URL: `http://localhost:3000/api`

### POST `/auth/register`

Register an account. `role` decides which fields apply.

**Body — User:**
```json
{
  "role": "user",
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "phone": "555-0100",
  "city": "Austin"
}
```

**Body — Service Provider:**
```json
{
  "role": "service_provider",
  "fullName": "Bob Smith",
  "email": "bob@plumbingpro.com",
  "password": "secret123",
  "businessName": "Plumbing Pro LLC",
  "serviceCategory": "Plumbing",
  "yearsOfExperience": 8
}
```

**Body — Realtor:**
```json
{
  "role": "realtor",
  "fullName": "Alice Realtor",
  "email": "alice@realty.com",
  "password": "secret123",
  "licenseNumber": "TX-12345",
  "agencyName": "Best Realty"
}
```

Response: `201` with `accessToken` and the account record.

### POST `/auth/login`

Email is globally unique, so login does **not** need a `role` field — the server reads `role` from the matched account.

```json
{
  "email": "jane@example.com",
  "password": "secret123"
}
```

Response: `200` with `accessToken`.

### GET `/auth/me`

Header: `Authorization: Bearer <token>`

Returns the currently authenticated account.

---

## Authentication

Every protected route expects the JWT in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOi...
```

The token payload contains `{ id, email, role }` so downstream handlers know which role is calling.

To restrict an endpoint to specific roles, compose `verifyToken` with `requireRole`:

```js
const { verifyToken, requireRole } = require('./middleware/auth.middleware');

router.post('/bids', verifyToken, requireRole('service_provider'), bidsController.create);
```
