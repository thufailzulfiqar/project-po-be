# Project PO — Backend

Backend untuk mengimpor data Purchase Order (PO) / Delivery Note dari file
**Excel** dan **PDF** ke **PostgreSQL** secara otomatis, dengan autentikasi JWT,
validasi data, audit log, dan fitur re-import.

## Stack
Node.js · Express 5 · Sequelize (PostgreSQL) · JWT · Multer · ExcelJS · pdf-parse · bcrypt · dotenv

## Setup

```powershell
# 1. Install dependency (sudah dilakukan saat scaffold)
npm install

# 2. Salin & isi environment variable
Copy-Item .env.example .env   # lalu sesuaikan DB_* dan JWT_SECRET

# 3. Buat database di PostgreSQL
#    psql -U postgres -c "CREATE DATABASE po_db;"

# 4. Buat user admin awal (sekaligus sync tabel)
npm run seed:admin            # default: admin / admin123

# 5. Jalankan server (auto-reload)
npm run dev
```

Server: `http://localhost:3000`. Health check: `GET /api/health`.

> Di mode `development`, tabel di-`sync({ alter: true })` otomatis saat start.
> Untuk produksi, gunakan migrations (`npm run db:migrate`).

## Struktur

```
src/
  config/      koneksi DB & env
  models/      User, PoDocument, PoItem, ImportJob, ImportError, AuditLog
  controllers/ auth, upload, import, po
  services/    excelParser, pdfParser, importService, auditService
  middlewares/ auth (JWT), upload (multer), validate, errorHandler
  routes/      auth, upload, po/imports
  utils/       numberParser (format ribuan ID), logger
server.js      entry point
scripts/       createAdmin.js
```

## API

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/auth/register` | Daftar user |
| POST | `/api/auth/login` | Login → token JWT |
| GET  | `/api/auth/me` | Profil user (perlu token) |
| POST | `/api/upload` | Upload file PO (`multipart/form-data`, field `file`) → langsung diproses |
| GET  | `/api/po` | Daftar dokumen PO |
| GET  | `/api/po/:id` | Detail dokumen + item |
| GET  | `/api/imports` | Riwayat import (hasil import) |
| GET  | `/api/imports/:id` | Detail job + error |
| GET  | `/api/imports/:id/errors` | Baris yang gagal import |
| POST | `/api/imports/:id/reimport` | Re-import file |

Semua endpoint selain register/login butuh header `Authorization: Bearer <token>`.

## Catatan parsing
- **Angka format Indonesia**: titik `.` = pemisah ribuan (`1.693` → `1693`).
  Lihat `src/utils/numberParser.js`.
- **Aturan bisnis**: `KANBAN × QTY/KBN = TOTAL QTY` divalidasi tiap baris.
- Parser Excel/PDF bersifat heuristik — sesuaikan label kolom di
  `src/services/excelParser.js` / `pdfParser.js` dengan file asli Anda.
