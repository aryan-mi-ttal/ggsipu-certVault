# GGSIPU Low-Cost Lite Blockchain-Based Certificate Generation, Verification & Management System

> **Problem Statement ID**: `GGSIPU2609`  
> **Organization**: Directorate of Students' Welfare (DSW), Guru Gobind Singh Indraprastha University (GGSIPU), Sector 16-C, Dwarka, New Delhi.  
> **Tech Stack**: Google Apps Script (V8), Google Workspace (Sheets, Drive, Gmail), WebCrypto SHA-256 Hashing, NeonDB PostgreSQL, Express.js REST API, HTML5/CSS3/JavaScript SPA, HTML5 Camera QR Code Scanner, Merkle Tree Cryptographic Proof.

---

## 🌟 Executive Summary

Every academic year, GGSIPU's Directorate of Students' Welfare (DSW) and its various University Schools (USICT, USMS, USLLS, USCT, etc.) issue thousands of certificates for hackathons, workshops, FDPs, industrial training, events, and academic achievements.

**GGSIPU CertVault** provides a **zero-infrastructure cost, lightweight, blockchain-compatible certificate lifecycle platform** that runs natively on GGSIPU's existing Google Workspace domain combined with **NeonDB PostgreSQL Database Authentication**, complete state machine security, automated approval workflows, and multi-tier Role-Based Access Control (RBAC).

---

## 🚀 System Architecture & User Flow

```
                       ┌────────────────────────────────────────────────────────┐
                       │          GGSIPU CertVault (index.html)                 │
                       └──────────────────────────┬─────────────────────────────┘
                                                  │
                                                  ▼
                        ┌──────────────────────────────────────────────────┐
                        │      HOMEPAGE DEFAULT: Public Verifier Portal    │
                        ├──────────────────────────────────────────────────┤
                        │ • Instant QR Code Webcam Scanner                 │
                        │ • Certificate ID Lookup Search Bar                │
                        │ • Client-Side PDF SHA-256 WebCrypto Hasher       │
                        │ • Blockchain Cryptographic Proof Inspector       │
                        │ • Open to Anyone — NO login required             │
                        └─────────────────────────┬────────────────────────┘
                                                  │
                                    User clicks "Staff Portal"
                                                  │
                                                  ▼
                        ┌──────────────────────────────────────────────────┐
                        │       NeonDB Email & Password Sign In Modal      │
                        │      (Live Verification against NeonDB Database) │
                        └─────────────────────────┬────────────────────────┘
                                                  │
                      ┌───────────────────────────┴───────────────────────────┐
                      │                                                       │
                      ▼                                                       ▼
       ┌─────────────────────────────┐                         ┌─────────────────────────────┐
       │         ADMIN Role          │                         │     APPROVER / ISSUER /     │
       │                             │                         │         VIEWER Role         │
       ├─────────────────────────────┤                         ├─────────────────────────────┤
       │ • Analytics Dashboard       │                         │ • Analytics Dashboard       │
       │ • Bulk CSV Issuer           │                         │ • Approver: Sign & Revoke   │
       │ • Approvals Queue & Canvas  │                         │ • Issuer: CSV Upload & Des. │
       │ • Certificate Designer      │                         │ • Viewer: Read-only Logs    │
       │ • Audit Logs & Revocation   │                         │ • Instant Logout button     │
       │ • NeonDB Staff Management   │                         │ • Return to Verifier anytime│
       │ • Backend & GAS Config      │                         └─────────────────────────────┘
       └─────────────────────────────┘
```

### 1. Default Homepage: Public Verifier
When anyone visits the web application (`index.html`), it opens immediately to the **Public Verifier** tab. Visitors can scan certificate QR codes with their webcam, search certificate records by ID, or drag-and-drop certificate PDFs for instant client-side WebCrypto SHA-256 verification against the ledger. All administrative and management tabs are hidden and secured.

### 2. Staff Portal Authentication (NeonDB Database)
To access administrative and management tools, staff members click the **"Staff Portal"** button in the top navigation bar:
- Users enter their registered staff email and password.
- Credentials are authenticated directly against the **NeonDB PostgreSQL** database via the Express API (`/api/auth/login`).
- **No hardcoded users**: All staff accounts, credentials, and roles are retrieved dynamically from the database.
- Unlocks tabs tailored to the user's role:
  - **ADMIN**: Dashboard, Bulk Issuer, Approvals, Designer, Audit Logs, Staff Users (NeonDB), System Config.
  - **APPROVER**: Dashboard, Approvals Queue (sign & approve), Audit Logs, and Revocation.
  - **ISSUER**: Dashboard, Bulk CSV Issuer (upload & submit batches), and Certificate Designer.
  - **VIEWER**: Dashboard, Audit Logs (read-only).
- Clicking **Logout** immediately terminates the staff session, hides all staff tabs, and returns to the Public Verifier.

---

## 📂 Repository Structure

```
ggsipu-certVault/
├── backend/                            # Express.js & NeonDB Backend API
│   ├── src/
│   │   ├── routes/auth.routes.js       # NeonDB Auth & Users CRUD endpoints
│   │   ├── db.js                       # NeonDB PostgreSQL connection pool & schema init
│   │   ├── app.js                      # Express App & CORS configuration
│   │   └── server.js                   # Backend Server entry point
│   ├── package.json                    # Backend dependencies (express, pg, cors, dotenv)
│   ├── .env                            # Environment variables (DATABASE_URL, PORT)
│   └── README.md                       # Backend API Documentation
├── apps-script/                        # Production Google Apps Script Engine
│   ├── Code.gs                         # REST API router & RPC Controller
│   ├── CryptoEngine.gs                 # SHA-256 & Merkle Tree calculation module
│   ├── CertGenerator.gs                # Batch ID Gen, Merkle root persistence, Mail
│   ├── ApprovalWorkflow.gs             # Workflow state machine & signature handler
│   ├── RevocationLog.gs                # State-guarded revocation ledger & audit logs
│   └── appsscript.json                 # Apps Script manifest file
├── frontend/                           # Single Page Web Application
│   ├── index.html                      # Unified Web UI layout (Public Verifier + Staff Portal)
│   ├── style.css                       # Responsive design system & glassmorphism theme
│   └── app.js                          # SPA state manager, WebCrypto hasher & Auth controller
├── docs/                               # System Documentation
│   ├── GoogleSheets_Template_Schema.md # Google Sheets database schema
│   └── Deployment_Guide.md             # Complete step-by-step deployment guide
├── sample_students.csv                 # Pre-populated synthetic dataset for bulk testing
└── README.md                           # Project Documentation Overview
```

---
Google Drive of certificates:- https://drive.google.com/drive/folders/1N-_0HR63MVPQt8BZ5WOIdc4m45igkcs_?usp=sharing
## 🛠️ Testing & Running the System

### 1. Configure NeonDB Database Key
Open [`backend/.env`](file:///D:/Ideathon/SIH2026-TechRoaches/backend/.env) and set your NeonDB connection string:
```env
PORT=5000
FRONTEND_URL=http://localhost:5500
DATABASE_URL=postgresql://neondb_owner:YOUR_NEONDB_PASSWORD@ep-ancient-glitter-aznti8xi-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

### 2. Start the Backend API
In your terminal, navigate to the `backend` folder and start the server:
```bash
cd backend
npm run dev
```
The backend will automatically verify/create the `users` table and listen on `http://localhost:5000`.

### 3. Open the Frontend
Open [`frontend/index.html`](file:///D:/Ideathon/SIH2026-TechRoaches/frontend/index.html) in your web browser (or via VS Code Live Server):
1. **Public Verifier**: Try verifying sample Certificate ID `GGSIPU-2026-DSW-1001` (Valid), `GGSIPU-2026-DSW-1003` (Pending), or `GGSIPU-2026-DSW-1005` (Revoked).
2. **Staff Portal Sign In**: Click **Staff Portal** in the top navigation bar.
3. Enter your NeonDB registered credentials (e.g. `admin@certvault.demo` / `CertVault@123` or your created staff account).
4. The system validates the credentials against NeonDB and unlocks the authorized staff workflow.
5. In the **Staff Users** tab, Administrators can add new staff, change roles, and update credentials directly in NeonDB.

---

## 🏛️ Developed for GGSIPU Hackathon / SIH Problem GGSIPU2609
Directorate of Students' Welfare (DSW), Guru Gobind Singh Indraprastha University.
