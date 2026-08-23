# GGSIPU CertVault - Deployment & Access Control Guide

## Overview

GGSIPU CertVault provides a unified, single deployment web application:
1. **Public Verifier (Default Open Access)**: When anyone opens `index.html` (or the deployed Apps Script URL), it immediately displays the **Public Verifier** (Search by Cert ID, Live QR code webcam scanner, PDF drag-and-drop WebCrypto SHA-256 verifier). No login required.
2. **Staff Portal (Google Authentication & Role-Based Access)**: Clicking the **"Staff Portal"** button in the header opens a Google authentication prompt. Once authenticated against the authorized `Users` sheet in Google Sheets, the system unlocks the staff management modules (Dashboard, Bulk CSV Issuer, Approvals Queue, Certificate Designer, Audit Logs, Staff Users).

---

## Step 1: Set up Google Sheets Master Ledger

1. Log in to your GGSIPU Google Workspace account (`@ipu.ac.in` or `@ggsipu.edu`).
2. Create a new Google Sheet named **`GGSIPU_Certificate_Master_Ledger`**.
3. Create the following **4 sheets (tabs)**:
   - **`CertificateLedger`**: Stores all issued, pending, and revoked certificates with SHA-256 digests and Merkle roots.
   - **`Users`**: Stores authorized staff email addresses and assigned RBAC roles.
   - **`AuditLogs`**: Stores tamper-evident action logs of all user actions, state transitions, and staff updates.
   - **`Revocations`**: Stores formal revocation records and mandatory reasons.

4. Initialize the **`Users`** sheet with header row:
   ```
   Email | Role | Added On
   ```
   Add initial staff accounts on subsequent rows:
   ```
   dsw.admin@ipu.ac.in | Admin | 2026-08-20
   dean.dsw@ipu.ac.in  | Approver | 2026-08-20
   usict.issuer@ipu.ac.in | Issuer | 2026-08-20
   audit.viewer@ipu.ac.in | Viewer | 2026-08-20
   ```

---

## Step 2: Bind Google Apps Script Backend

1. In your Google Sheet, click **Extensions -> Apps Script**.
2. Rename the project to **`ggsipu-certVault`**.
3. Copy the script files from [`apps-script/`](file:///D:/Ideathon/SIH2026-TechRoaches/apps-script/):
   - `Code.gs` &larr; [`apps-script/Code.gs`](file:///D:/Ideathon/SIH2026-TechRoaches/apps-script/Code.gs)
   - `CryptoEngine.gs` &larr; [`apps-script/CryptoEngine.gs`](file:///D:/Ideathon/SIH2026-TechRoaches/apps-script/CryptoEngine.gs)
   - `CertGenerator.gs` &larr; [`apps-script/CertGenerator.gs`](file:///D:/Ideathon/SIH2026-TechRoaches/apps-script/CertGenerator.gs)
   - `ApprovalWorkflow.gs` &larr; [`apps-script/ApprovalWorkflow.gs`](file:///D:/Ideathon/SIH2026-TechRoaches/apps-script/ApprovalWorkflow.gs)
   - `RevocationLog.gs` &larr; [`apps-script/RevocationLog.gs`](file:///D:/Ideathon/SIH2026-TechRoaches/apps-script/RevocationLog.gs)
4. Enable manifest view (**Project Settings -> Show "appsscript.json" manifest file in editor**) and paste [`apps-script/appsscript.json`](file:///D:/Ideathon/SIH2026-TechRoaches/apps-script/appsscript.json).

---

## Step 3: Authorize Permissions & Deploy as Web App

1. **Authorize OAuth Scopes**:
   - In the Apps Script editor, in the top toolbar dropdown (next to "Debug"), select the function **`testAuthorizeAndSendEmail`**.
   - Click **Run ▶**.
   - When the popup **"Authorization required"** appears:
     - Click **Review Permissions**.
     - Select your Google account.
     - Click **Advanced** &rarr; **Go to ggsipu-certVault (unsafe)**.
     - Click **Allow**.
   - Check the Execution log at the bottom; you should see: `"Email sent successfully... via GmailApp / MailApp"`.

2. **Deploy as Web App (Single Deployment)**:
   - Click **Deploy -> New Deployment** (or **Manage Deployments -> Edit -> New Version**).
   - Select type: **Web App**.
   - Configuration:
     - **Description**: `GGSIPU CertVault Unified System v3.1`
     - **Execute as**: `Me (your.email@ipu.ac.in)` *(Required so backend relay can send emails)*
     - **Who has access**: `Anyone` *(Ensures public verifier and backend API relay are accessible)*
   - Click **Deploy**.
   - Copy the generated **Web App URL** (e.g. `https://script.google.com/macros/s/.../exec`) and set it as `GAS_API_URL` in `backend/.env`.


---

## Step 4: Role-Based Access Control (RBAC) Mapping

| Capability | Public (No Login) | Viewer | Issuer | Approver | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Public Verifier (QR / ID / PDF)** | ✅ Open | ✅ Open | ✅ Open | ✅ Open | ✅ Open |
| **Dashboard Analytics & Master Ledger** | ❌ | ✅ Read-only | ✅ Full | ✅ Full | ✅ Full |
| **Bulk CSV Uploader & Batch Issuance** | ❌ | ❌ | ✅ Full | ❌ | ✅ Full |
| **Certificate Designer Canvas Preview** | ❌ | ❌ | ✅ Full | ❌ | ✅ Full |
| **Digital Signature & Approval Queue** | ❌ | ❌ | ❌ | ✅ Full | ✅ Full |
| **Certificate Revocation (with reason)** | ❌ | ❌ | ❌ | ✅ Full | ✅ Full |
| **Immutable Audit Trail Logs** | ❌ | ✅ Read-only | ❌ | ✅ Read-only | ✅ Full |
| **Staff Users Management (`Users` Tab)** | ❌ | ❌ | ❌ | ❌ | ✅ Full (CRUD) |

---

## Step 5: Managing Staff Accounts

### Adding a Staff Member
1. Log in to the Staff Portal with an **Admin** account.
2. Click the **Staff Users** tab in the top navigation bar.
3. Click **Add New Staff Member**.
4. Enter the Google email and select their role (`Admin`, `Approver`, `Issuer`, `Viewer`).
5. Click **Save Staff User**. The change takes effect immediately and updates the `Users` sheet.

### Direct Google Sheets Editing
Open the `Users` tab in the Google Sheet and add, edit, or delete rows directly.
