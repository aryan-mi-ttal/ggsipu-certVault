# CertVault Backend API & NeonDB Services

Express.js backend providing real-time PostgreSQL database authentication, staff management, bulk certificate generation, PDF rendering (`pdf-lib`), and Google Drive cloud storage with NeonDB.

## Features

- **Direct NeonDB Authentication**: Authenticates email and password queries directly against PostgreSQL in NeonDB.
- **Bulk Certificate Generation**: Parses `.xlsx`/`.xls`/`.csv` spreadsheets, validates required columns, computes canonical SHA-256 digests, and stores certificates with `status = 'pending'` inside an atomic PostgreSQL database transaction.
- **High-Resolution PDF Generation**: Renders A4 landscape certificates with embedded QR verification codes, cryptographic SHA-256 stamp, dynamic recipient data, university branding, and gold ornamental borders using `pdf-lib` and `qrcode`.
- **Google Drive Cloud Storage**: Uploads rendered certificate PDFs directly to Google Drive via Service Account authentication and assigns public view permissions (`role: reader, type: anyone`).
- **Role-Based Access Control (RBAC)**: Enforces Admin-only access on batch generation and PDF rendering endpoints via JWT / Session / API Key auth middleware.
- **Auto Schema Initialization**: Auto-creates and updates the `users` and `certificates` tables (including `pdf_url` and `pdf_file_id`) upon connection.
- **Windows IPv4 DNS Optimization**: Automatically configures `ipv4first` and custom pool DNS lookup with Google DNS fallback to avoid Windows IPv6 CNAME `ENOTFOUND` errors.
- **Modular Design**: Separates Excel parsing, ID generation, cryptographic hashing, PDF rendering, Google Drive upload, and database persistence into distinct reusable services.

---

## Configuration (`.env`)

Add your NeonDB connection string and Google Cloud credentials in `backend/.env`:

```env
PORT=5000
FRONTEND_URL=http://localhost:5500
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-ancient-glitter-aznti8xi-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
ADMIN_API_KEY=GGSIPU_ADMIN_KEY_2026
JWT_SECRET=certvault_jwt_secret_key_2026_dsw

# Google Drive Cloud Storage (Service Account)
# GOOGLE_SERVICE_ACCOUNT_KEY can be a Base64-encoded JSON key, raw JSON string, or path to service_account.json
GOOGLE_SERVICE_ACCOUNT_KEY=
GDRIVE_FOLDER_ID=
```

> **Note**: If `GOOGLE_SERVICE_ACCOUNT_KEY` or `GDRIVE_FOLDER_ID` is omitted, the PDF rendering engine will still generate the PDF and populate deterministic mock Drive reference URLs so offline and local development continues seamlessly without crashing.

---

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

---

## API Endpoints

### 1. Health Check
```http
GET http://localhost:5000/api/health
```

### 2. User Login
```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@certvault.demo",
  "password": "CertVault@123"
}
```

### 3. Bulk Certificate Generation (Admin Only)
```http
POST http://localhost:5000/api/certificates/bulk-generate
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: multipart/form-data
```
**Form Data**:
- `file`: `students.xlsx` (max 5MB, `.xlsx`, `.xls`, or `.csv`)

### 4. Generate Certificate PDFs & Upload to Google Drive (Admin Only)
```http
POST http://localhost:5000/api/certificates/generate-pdf
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json

{
  "allNull": true
}
```
*Or targeting specific certificate IDs:*
```json
{
  "certIds": [
    "GGSIPU-2026-USICT-0001-F091",
    "GGSIPU-2026-USICT-0002-E3F8"
  ]
}
```

**Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Processed PDF generation: 2 generated successfully, 0 failed.",
  "totalAttempted": 2,
  "successCount": 2,
  "generated": [
    {
      "certId": "GGSIPU-2026-USICT-0001-F091",
      "name": "Aarav Sharma",
      "pdfUrl": "https://drive.google.com/file/d/1A2B3C4D5E6F/view?usp=sharing",
      "pdfFileId": "1A2B3C4D5E6F",
      "isMock": false
    }
  ],
  "failed": []
}
```

### 5. List Generated Certificates
```http
GET http://localhost:5000/api/certificates?status=pending
Authorization: Bearer <TOKEN>
```

### 6. Staff User Management
- `GET /api/auth/users` - List all staff members
- `POST /api/auth/users` - Create or update staff member
- `DELETE /api/auth/users/:id` - Delete staff member
