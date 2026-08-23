# GGSIPU Certificate System - Google Sheets Schema Documentation

## Sheets Structure

### 1. `CertificateLedger` Sheet
Stores all issued, pending, and revoked certificates with cryptographic proof hashes.

| Column Header | Data Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `CertID` | String | Unique Certificate Identifier | `GGSIPU-2026-DSW-1001` |
| `RollNumber` | String | Student Roll Number | `01216403221` |
| `StudentName` | String | Full Name of Recipient | `Aarav Sharma` |
| `School` | String | University School / Centre | `USICT` |
| `Course` | String | Degree / Course Name | `B.Tech CSE` |
| `EventName` | String | Event / Hackathon Title | `Smart India Hackathon 2026` |
| `IssueDate` | Date | Date of Certificate Issuance | `2026-08-15` |
| `Status` | Enum | `Draft` \| `Pending` \| `Approved` \| `Issued` \| `Revoked` | `Approved` |
| `SHA256Hash` | Hex String | Cryptographic SHA-256 Digest | `a3b9c7...` |
| `MerkleRoot` | Hex String | Batch Merkle Tree Root | `8f2d4e...` |
| `DrivePdfUrl` | URL | Encrypted PDF link in Drive | `https://drive.google.com/...` |
| `QrVerificationUrl` | URL | Public Verification Link | `https://script.google.com/.../exec?page=verify&certId=...` |
| `ApprovedBy` | String | Authority Name & Designation | `Prof. Dean DSW` |
| `ApprovalDate` | Date | Date of Competent Sign-off | `2026-08-15` |

---

### 2. `Users` Sheet (Access Control & RBAC)
Authorizes university staff members to access the Staff Portal based on their Google Workspace account.

| Column Header | Data Type | Description | Allowed Values / Example |
| :--- | :--- | :--- | :--- |
| `Email` | String | Google Workspace Email Address | `dean.dsw@ipu.ac.in` |
| `Role` | Enum | Assigned Role | `Admin` \| `Approver` \| `Issuer` \| `Viewer` |
| `Added On` | Date / String | Date when user was provisioned | `2026-08-20` |

#### Role Permission Mapping

| Role | Dashboard | Public Verifier | Bulk Issuer | Approvals Queue | Certificate Designer | Audit Logs | Staff Users & System Config |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Admin** | ✅ Full | ✅ Link | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full (Manage Users & Config) |
| **Approver** | ✅ Full | ✅ Link | ❌ | ✅ (Sign/Approve & Revoke) | ❌ | ✅ View | ❌ |
| **Issuer** | ✅ Full | ✅ Link | ✅ (CSV Upload & Submit) | ❌ | ✅ Full | ❌ | ❌ |
| **Viewer** | ✅ Read-only | ✅ Link | ❌ | ❌ | ❌ | ✅ View | ❌ |

---

### 3. `AuditLogs` Sheet
Immutable log recording all user actions, batch issuances, approvals, revocations, and staff access changes for security auditing.

| Column Header | Data Type | Description |
| :--- | :--- | :--- |
| `Timestamp` | ISO String | Date & Time of action |
| `EventType` | Enum | `BATCH_ISSUANCE` \| `APPROVAL` \| `REVOCATION` \| `USER_ADDED` \| `USER_ROLE_CHANGED` \| `USER_REMOVED` |
| `Details` | Text | Description of action & cryptographic root |
| `PerformedBy` | String | Authenticated Google account email of staff member |

---

### 4. `Revocations` Sheet
Detailed record of revoked certificates for fast blacklist checks and audit compliance.

| Column Header | Data Type | Description |
| :--- | :--- | :--- |
| `CertID` | String | Targeted Certificate ID |
| `RevocationReason` | Text | Mandatory formal reason for revocation |
| `RevokedBy` | String | Competent Authority email / name |
| `RevocationTimestamp` | ISO String | Timestamp when status changed to Revoked |
| `PreviousStatus` | String | Status prior to revocation (`Pending` or `Approved`) |
