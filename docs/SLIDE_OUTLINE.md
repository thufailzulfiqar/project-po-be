# Slide Outline — Presentasi Project PO Backend

Outline siap salin ke PowerPoint/Google Slides. Tiap blok = 1 slide
(judul + poin bullet + catatan pembicara).

---

## Slide 1 — Judul
**Sistem Import Purchase Order Otomatis (Excel & PDF → PostgreSQL)**
- Backend Web · Node.js · Express · PostgreSQL
- Nama Anda · Tanggal

> Catatan: buka dengan masalahnya — input PO manual itu lambat & rawan salah.

---

## Slide 2 — Latar Belakang / Masalah
- Data PO datang sebagai file **Excel** dan **PDF** (Delivery Note).
- Input manual ke sistem: **lambat, rawan salah ketik**, sulit ditelusuri.
- Format angka lokal (`1.693` = 1.693 ribu) sering salah baca.

> Catatan: tekankan volume — puluhan baris part per dokumen, tiap hari.

---

## Slide 3 — Tujuan Sistem
- Login aman (JWT).
- Upload file PO (Excel/PDF) → data **otomatis** masuk database.
- **Validasi** otomatis + tampilkan data yang gagal.
- **Re-import** & **audit log** (semua aktivitas tercatat).

---

## Slide 4 — Teknologi yang Digunakan
- **Node.js + Express.js** — REST API
- **PostgreSQL + Sequelize ORM** — database
- **Multer** — upload file
- **ExcelJS** — baca Excel
- **pdfjs-dist** — baca PDF (berbasis koordinat)
- **JWT + bcrypt** — autentikasi & keamanan password

> Catatan: semua JavaScript murni (bukan TypeScript).

---

## Slide 5 — Arsitektur / Alur Besar
Tampilkan diagram alur (render dari `docs/diagram.puml` → `flow`):

`Upload → Simpan File → Parsing → Validasi → Simpan DB → Audit`

- **Satu endpoint** `POST /api/upload` menjalankan seluruh rantai.

---

## Slide 6 — Tahap 1: Upload File (Multer)
- `diskStorage()` → simpan ke folder `uploads/` dengan nama unik
- `fileFilter()` → hanya `.xlsx`, `.xls`, `.pdf`
- `limits.fileSize` → batas 10 MB
- Dibuat **ImportJob** = catatan tiap upload (status, jumlah baris)

---

## Slide 7 — Tahap 2: Parsing Excel (ExcelJS)
- Buka workbook → baca worksheet
- **Deteksi header dokumen** (cari label `DN NO`, `PO NO`, …)
- **Deteksi tabel item** (cari judul kolom `UNIQ NO`, `PART NO`, …)
- Baca tiap baris → ubah ke objek standar

> Hasil: `{ header, items[] }`

---

## Slide 8 — Tahap 3: Parsing PDF (Tantangan & Solusi) ⭐
**Masalah:** teks PDF keluar **acak / terpecah** antar kolom → tak bisa dibaca baris-per-baris.

**Solusi — pakai KOORDINAT (x, y):**
1. Ambil tiap teks + posisinya (x, y)
2. Kelompokkan jadi **baris** (y berdekatan)
3. Deteksi **posisi kolom** dari baris header
4. Petakan tiap sel ke **kolom terdekat** (berdasar x)

> Catatan: ini bagian paling teknis & paling "menjual". Tampilkan contoh teks acak vs hasil rapi.

---

## Slide 9 — Tahap 4: Normalisasi & Validasi Data
- **Angka format Indonesia:** `"1.693"` → `1693` (titik = ribuan)
- **Tanggal:** `"Monday, 14 July 2025"` → `2025-07-14`
- **Validasi bisnis:** `KANBAN × QTY/KBN = TOTAL QTY`
- Baris gagal → dicatat ke `import_errors` (bisa ditinjau)

---

## Slide 10 — Tahap 5: Simpan ke Database
- **Sequelize ORM** + **transaksi** (atomik, rollback bila error)
- **Upsert by `DN NO`**: DN sama → update; DN baru → buat baru
- Relasi: `po_documents (1) ─< (N) po_items`

> Catatan: jelaskan kenapa transaksi penting → data tidak setengah jadi.

---

## Slide 11 — Skema Database (ER)
Tampilkan diagram ER (render dari `docs/diagram.puml` → `er`):
- `users`, `po_documents`, `po_items`, `import_jobs`, `import_errors`, `audit_logs`

---

## Slide 12 — Hasil, Audit & Re-import
- **Status import**: success / partial / failed (otomatis)
- **Audit log**: LOGIN, UPLOAD, IMPORT, REIMPORT tercatat
- **Re-import**: proses ulang file yang sama
- Contoh response:
  `{ status: "success", totalRows: 39, successRows: 39, failedRows: 0 }`

---

## Slide 13 — Demo Langsung (Postman)
1. Login → dapat token
2. Upload `DN 14 JUL 2025.pdf`
3. Lihat hasil: 39 baris masuk
4. Lihat data di `GET /api/po/:id`
5. (Opsional) tunjukkan baris gagal & re-import

> Catatan: siapkan server `npm run dev` & Postman sebelum mulai.

---

## Slide 14 — Daftar Endpoint API
| Method | Endpoint | Fungsi |
|---|---|---|
| POST | /api/auth/login | Login → token |
| POST | /api/upload | Upload + proses file |
| GET | /api/po | Daftar PO |
| GET | /api/po/:id | Detail PO + item |
| GET | /api/imports | Riwayat import |
| GET | /api/imports/:id/errors | Data gagal |
| POST | /api/imports/:id/reimport | Import ulang |

---

## Slide 15 — Keunggulan & Rencana Lanjut
**Keunggulan:**
- Otomatis penuh, satu endpoint
- Tahan PDF berantakan (koordinat)
- Validasi bisnis nyata + atomik + auditable

**Rencana lanjut (opsional):**
- Frontend dashboard
- Dukungan format supplier lain
- Export laporan / notifikasi

---

## Slide 16 — Penutup / Tanya Jawab
- Ringkas 3 poin kunci
- "Terima kasih — ada pertanyaan?"
