# NAWI Digital Metrology Test Report Generation System (SIH PS 26035)

> **Digital Metrology Test Report Generation System for Non-Automatic Weighing Instruments (NAWI) as per OIML R-76 Standard.**

---

## 📋 Table of Contents
- [Overview](#overview)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Approved Technical Deviations](#approved-technical-deviations)
- [First-Run Setup & Quickstart](#first-run-setup--quickstart)
- [Database Seeding & Pre-loaded Accounts](#database-seeding--pre-loaded-accounts)
- [Project Directory Structure](#project-directory-structure)
- [Available Scripts](#available-scripts)
- [Verification & Testing](#verification--testing)
- [System Limitations](#system-limitations)

---

## 🎯 Overview
This platform automates metrological verification, error calculation, and test report generation for Non-Automatic Weighing Instruments (NAWI) in accordance with the International Organization of Legal Metrology (**OIML R-76:2006** standard).

Key Capabilities:
- **Metrological Compliance Engine**: Evaluates maximum permissible error (MPE) bands (0.5e, 1.0e, 1.5e) using deterministic fixed-point BigInt scaled-integer math to prevent floating-point inaccuracies.
- **Rule Governance & Separation of Duties**: Metrological rules are authored in `draft` state and must be independently verified and activated by a registered `metrology_expert`.
- **Multi-Tenant Scoping**: Laboratories, Manufacturers, and Reviewing Officers operate within strictly scoped role and organization boundaries.
- **Cryptographic Report Integrity**: Generated PDF test reports embed SHA-256 payload hashes and HMAC-SHA256 verification signatures.
- **Offline Progressive Web App (PWA)**: Supports offline data collection during site calibrations, caching static assets and synchronizing queued operations.

---

## 🏗 Architecture & Tech Stack

- **Backend**: Node.js 20+ / Express 4 (ES Modules)
- **Frontend**: React 18 / Vite 6 / Lucide Icons / TanStack Query
- **Database**: MongoDB 6+ / Mongoose 8 ORM
- **Compliance Calculations**: Scaled Integer Math (`e × 10,000` fixed-point representation)
- **Document Generation**: Puppeteer HTML-to-PDF / docx engine

---

## ⚙️ Approved Technical Deviations

Per team lead architectural directives (recorded in `docs/DEVIATIONS.md`):

1. **Database Backend**: Uses **MongoDB** (with Mongoose schema validation) in place of PostgreSQL.
2. **Language Runtime**: Written in **Modern JavaScript (ES Modules)** rather than TypeScript.

---

## 🚀 First-Run Setup & Quickstart

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local instance running at `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI

### 1. Environment Configuration
Copy `.env.example` in `server/` to `.env`:
```bash
cd server
cp .env.example .env
```
Ensure `.env` contains valid secrets:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/nawi
JWT_SECRET=super_secret_nawi_digital_metrology_system_jwt_token_key_64_chars_long
JWT_EXPIRES_IN=8h
BCRYPT_SALT_ROUNDS=10
CLIENT_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200
REPORT_INTEGRITY_SECRET=change_me_to_a_random_64_char_secret_for_hmac_sha256_integrity
PUBLIC_APP_URL=http://localhost:5173
ENABLE_DEMO=false
```
Keep `NODE_ENV=development` in the local `.env`; production deployments receive their own environment variables. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for separate backend and frontend Vercel setup.

### 2. Install Dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Run Database Seeding
Execute the complete seed pipeline from the server directory:
```bash
cd server
npm run seed
```

---

## 👥 Database Seeding & Pre-loaded Accounts

Executing `npm run seed` executes the unified sequence (`seedAll.js`):
1. **`seedUsers.js`**: Creates default admin, metrology expert, lab admin, lab technician, reviewer, and manufacturer accounts.
2. **`seedRuleConfigs.js`**: Seeds OIML R-76 MPE rule configurations as `draft` (authored by admin).
3. **`activateRules.js`**: (Dev mode only) Activates draft rules under the `metrology_expert` identity with source references.
4. **`seedDemoData.js`**: Creates sample laboratories, manufacturers, instrument models, and test sessions.

### Pre-seeded Demo Accounts
All pre-seeded accounts share the password: `Password123!`

| Role | Email | Scope / Domain |
| :--- | :--- | :--- |
| **System Administrator** | `admin@nawi.gov.in` | Global System Access |
| **Metrology Expert** | `metrology@nawi.gov.in` | Rule Activation & Policy Governance |
| **Laboratory Admin** | `labadmin@nawi.gov.in` | National Metrology Institute (LAB-001) |
| **Lab Technician** | `tech1@nawi.gov.in` | NMI Laboratory (LAB-001) |
| **Reviewing Officer** | `reviewer1@nawi.gov.in` | NMI Laboratory (LAB-001) |
| **Manufacturer** | `manufacturer@acme-weighing.com` | Acme Weighing Systems Ltd. |

---

## 📂 Project Directory Structure

```
PS 26035/
├── client/                      # React SPA Frontend (Vite)
│   ├── public/                  # PWA Manifest & Static Assets
│   ├── src/
│   │   ├── components/          # Reusable UI Components & Badges
│   │   ├── config/              # Constants & OIML Annex Definitions
│   │   ├── pages/               # Route Pages (Dashboard, Sessions, Reports, Rules)
│   │   ├── services/            # Axios API Client & Endpoint Wrappers
│   │   ├── store/               # Zustand Auth & Notification Stores
│   │   ├── App.jsx              # Application Navigation & Router
│   │   └── main.jsx             # React DOM Entry
│   └── vite.config.js           # Vite Server & Build Settings
├── server/                      # Express.js REST API Backend
│   ├── src/
│   │   ├── config/              # Environment & Database Connections
│   │   ├── controllers/         # HTTP Route Handlers
│   │   ├── middleware/          # JWT Auth, RBAC & Tenant Scoping
│   │   ├── models/              # Mongoose Data Models
│   │   ├── routes/              # Express API Endpoint Routes
│   │   ├── scripts/             # Database Migration Utilities
│   │   ├── seed/                # Unified Database Seeding Pipeline
│   │   ├── services/            # Compliance Engine, Audit Logger & PDF Generator
│   │   ├── utils/               # Scaled Integer Math, BigInt & Error Handlers
│   │   └── server.js            # Express Server Instantiation
│   └── package.json             # Backend Dependencies & Scripts
├── docs/                        # Traceability & Metrology Governance Specs
│   ├── DEVIATIONS.md            # Official Technical Deviations Record
│   ├── GAP_INPUT.md             # Detailed System Gap Analysis
│   ├── OPEN_QUESTIONS.md        # Technical & Metrology Open Questions
│   └── TRACEABILITY.md          # Requirements Traceability Matrix
└── README.md                    # Project Documentation (UTF-8)
```

---

## 🛠 Available Scripts

### Backend (`/server`)
- `npm run dev`: Start development server with live reload (`node --watch`).
- `npm start`: Launch production server.
- `npm run seed`: Run unified seed pipeline (`seedUsers` → `seedRuleConfigs` → `activateDevRules` → `seedDemoData`).
- `npm run seed:users`: Seed initial user roles only.
- `npm run seed:rules`: Seed OIML R-76 rule configurations as draft.
- `npm run migrate:manufacturer-ref`: Backfill `manufacturerRef` linkage on User accounts.
- `npm run migrate:report-revisions`: Migrate legacy unique index on report revisions.
- `npm test`: Run backend unit and integration test suite using Jest.

### Frontend (`/client`)
- `npm run dev`: Start Vite development server (`http://localhost:5173`).
- `npm run build`: Compile production frontend assets into `/dist`.
- `npm run preview`: Preview local production build.

---

## ✅ Verification & Testing

### Running Tests
To verify system integrity, run the automated test suite in the `server` directory:
```bash
cd server
npm test
```
The test suite covers:
- BigInt scaled integer arithmetic precision.
- Separation of duties (preventing draft author from self-activating rules).
- Role-based access control and tenant isolation.
- Test session evaluation and report generation.

---

## ⚠️ System Limitations

1. **Local File Storage**: Uploaded photo evidence and PDF reports are saved to local server filesystem (`server/uploads/`). Production deployments should configure S3/Cloud Storage.
2. **Standard Scope**: Configured primarily for OIML R-76 non-automatic weighing instruments. Automatic weighing instruments (OIML R-51/R-107) require separate rule configurations.
3. **Cryptographic Tag Scope**: Report integrity tags use HMAC-SHA256 shared key authentication. Full PKI digital signatures require integration with an accredited X.509 Certificate Authority.
