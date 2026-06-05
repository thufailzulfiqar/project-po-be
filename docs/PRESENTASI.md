# Penjelasan Metode: Upload & Generate Database dari File Excel/PDF

Dokumen ini menjelaskan **bagaimana sistem mengubah file PO (Excel/PDF) menjadi
data di database PostgreSQL** secara otomatis — cocok untuk bahan presentasi.

---

## 1. Gambaran Umum Alur

```
                ┌────────────┐     1. UPLOAD          ┌──────────────────┐
   User  ──────▶│  Postman   │ ─────────────────────▶ │  Express API     │
   (Excel/PDF)  │  / Frontend│   POST /api/upload     │  /api/upload     │
                └────────────┘   (multipart/form-data)└──────────────────┘
                                                                │
   ┌────────────────────────────────────────────────────────────┘
   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ 2. SIMPAN    │──▶│ 3. PARSING   │──▶│ 4. VALIDASI  │──▶│ 5. SIMPAN DB │
│   FILE       │   │ Excel / PDF  │   │ data + rumus │   │ (transaksi)  │
│ (Multer)     │   │ → {header,   │   │              │   │ PostgreSQL   │
│ + ImportJob  │   │    items[]}  │   │              │   │ via Sequelize│
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
                                                                │
                                          6. CATAT HASIL ◀──────┘
                                   (status import, baris gagal, audit log)
```

Satu endpoint `POST /api/upload` menjalankan seluruh rantai ini sekali jalan.

---

## 2. Tahap 1 — Upload File (Multer)

**Teknologi:** [Multer](https://github.com/expressjs/multer) — middleware untuk
menangani `multipart/form-data` (upload file).

**File:** [src/middlewares/upload.js](../src/middlewares/upload.js)

Method/konfigurasi penting:

| Bagian | Fungsi |
|---|---|
| `multer.diskStorage()` | Menyimpan file ke folder `uploads/` di disk |
| `filename()` | Memberi nama unik (`namafile_<timestamp>.ext`) agar tidak bentrok |
| `fileFilter()` | **Hanya menerima** `.xlsx`, `.xls`, `.pdf` (selain itu ditolak) |
| `limits.fileSize` | Batas ukuran file (default 10 MB, dari `.env`) |
| `upload.single('file')` | Menerima 1 file dari field bernama `file` |

> Hasil: file fisik tersimpan, dan `req.file` berisi metadata (nama, path, dll).

---

## 3. Tahap 2 — Catat Pekerjaan Import (ImportJob)

**File:** [src/controllers/uploadController.js](../src/controllers/uploadController.js)

Sebelum diproses, dibuat 1 baris **`ImportJob`** sebagai *jejak* setiap upload:

```js
const job = await ImportJob.create({
  originalName: req.file.originalname,
  storedPath:   req.file.path,
  fileType,                 // 'excel' atau 'pdf' (dideteksi dari ekstensi)
  status: 'pending',
  uploadedBy: req.user.id,  // dari token JWT
});
```

Gunanya: riwayat upload, status (pending/success/partial/failed), jumlah baris
sukses/gagal, dan dasar untuk **re-import**.

---

## 4. Tahap 3 — Parsing File

Inti sistem. Tujuannya menyeragamkan file apa pun menjadi struktur:

```js
{ header: { dnNo, poNo, deliveryDate, supplierName, ... },
  items:  [ { uniqNo, partNo, partName, kanban, qtyPerKanban, totalQty, note }, ... ] }
```

### 4a. Parsing Excel — ExcelJS

**Teknologi:** [ExcelJS](https://github.com/exceljs/exceljs) — membaca isi sel `.xlsx/.xls`.
**File:** [src/services/excelParser.js](../src/services/excelParser.js)

Metode:
1. `workbook.xlsx.readFile()` → buka file.
2. **Deteksi header dokumen**: telusuri setiap sel, jika cocok label (`DN NO`,
   `REFER TO PO NO`, ...), ambil nilai di sel sebelahnya.
3. **Deteksi tabel item**: cari baris yang memuat judul kolom (`UNIQ NO`,
   `PART NO`, ...), lalu petakan nomor kolom → nama field.
4. Baca baris di bawahnya sampai habis, lewati baris kosong.

### 4b. Parsing PDF — pdfjs-dist (berbasis koordinat)

**Teknologi:** `pdfjs-dist` (mesin Mozilla PDF.js).
**File:** [src/services/pdfParser.js](../src/services/pdfParser.js)

> **Tantangan:** teks PDF jika diambil mentah keluar **acak/terpecah** —
> kolom-kolom tercampur, sehingga tidak bisa dibaca baris-per-baris.
> **Solusi:** baca **posisi (x, y)** tiap potongan teks, lalu rekonstruksi tabel.

Metode:
1. `getDocument()` + `getTextContent()` → ambil tiap fragmen teks **beserta
   koordinat** `transform[4]=x`, `transform[5]=y`.
2. **Kelompokkan per baris** (`clusterRows`): fragmen dengan `y` berdekatan
   (toleransi 4) dianggap satu baris.
3. **Deteksi kolom otomatis** (`findColumnMap`): temukan baris header, ambil
   posisi `x` tiap kolom (`UNIQ NO`@51, `PART NO`@130, dst).
4. **Petakan tiap sel ke kolom terdekat** berdasarkan `x` (`nearestField`).
5. Ulang untuk semua halaman, gabungkan hasilnya.

### 4c. Penanganan Angka Format Indonesia

**File:** [src/utils/numberParser.js](../src/utils/numberParser.js)

Di file PO, **titik = pemisah ribuan** (bukan desimal):
`"1.693"` → `1693`, `"2.488"` → `2488`. Fungsi `parseIndonesianNumber()`
menangani ini. Tanggal dinormalkan oleh [dateParser.js](../src/utils/dateParser.js)
(`"Monday, 14 July 2025"` → `2025-07-14`).

---

## 5. Tahap 4 — Validasi Data

**File:** [src/services/importService.js](../src/services/importService.js)

| Level | Aturan |
|---|---|
| Header | `DN NO` & `PO NO` wajib ada |
| Item | `UNIQ NO` & `PART NO` wajib, `KANBAN`/`QTY` tidak boleh negatif |
| **Bisnis** | **`KANBAN × QTY/KBN = TOTAL QTY`** harus konsisten |

Baris yang **lolos** → disimpan. Baris yang **gagal** → dicatat ke tabel
`import_errors` (lengkap dengan data asli + pesan error) supaya bisa ditinjau.

---

## 6. Tahap 5 — Simpan ke Database (Sequelize + Transaksi)

**Teknologi:** Sequelize ORM. **File:** [src/services/importService.js](../src/services/importService.js)

Disimpan dalam **satu transaksi** (`sequelize.transaction`) — kalau ada error
fatal, semua dibatalkan (rollback) sehingga data tidak setengah jadi.

Logika **upsert berdasarkan `DN NO`**:
```js
let document = await PoDocument.findOne({ where: { dnNo: header.dnNo } });
if (document) { /* DN sama → update header, ganti item lama */ }
else          { /* DN baru → buat dokumen baru */ }
// lalu tiap item valid → PoItem.create(...)
```

Relasi tabel yang terbentuk:
```
po_documents (1) ───< (N) po_items
import_jobs  (1) ───< (N) import_errors
users        (1) ───< (N) import_jobs / audit_logs
```

---

## 7. Tahap 6 — Hasil Import, Audit Log & Re-import

- **Status import** dihitung otomatis: `success` (semua lolos), `partial`
  (sebagian gagal), atau `failed` (semua gagal). Disimpan di `ImportJob`.
- **Audit log** ([auditService.js](../src/services/auditService.js)): setiap aksi
  (LOGIN, UPLOAD, IMPORT, REIMPORT) dicatat ke tabel `audit_logs`.
- **Re-import** (`POST /api/imports/:id/reimport`): memproses ulang file yang
  sama — berguna setelah memperbaiki sumber data.

Response akhir yang diterima user:
```json
{ "message": "File processed",
  "job": { "jobId": 1, "documentId": 1, "status": "success",
           "totalRows": 39, "successRows": 39, "failedRows": 0 } }
```

---

## 8. Ringkasan Teknologi per Tahap

| Tahap | Teknologi / Method utama |
|---|---|
| Upload file | **Multer** (`diskStorage`, `fileFilter`, `single`) |
| Autentikasi | **JWT** (Bearer token) + **bcrypt** (hash password) |
| Parsing Excel | **ExcelJS** (deteksi header & kolom otomatis) |
| Parsing PDF | **pdfjs-dist** (ekstraksi koordinat x/y + rekonstruksi tabel) |
| Normalisasi data | `numberParser` (format ribuan), `dateParser` (tanggal) |
| Validasi | Aturan header + rumus bisnis `KANBAN × QTY = TOTAL` |
| Simpan DB | **Sequelize ORM** + **transaksi** + upsert by `DN NO` |
| Audit & hasil | `ImportJob`, `ImportError`, `AuditLog` |

---

## 9. Poin Kuat untuk Presentasi

1. **Satu endpoint, proses penuh** — upload → parse → validasi → simpan → audit.
2. **Tahan terhadap PDF "acak"** — pakai koordinat, bukan sekadar teks mentah.
   Ini pembeda teknis yang kuat.
3. **Format angka lokal** ditangani benar (`1.693` = 1693, bukan 1,693 desimal).
4. **Validasi bisnis nyata** (`KANBAN × QTY = TOTAL`), bukan cuma cek kosong.
5. **Aman & atomik** — transaksi mencegah data setengah jadi.
6. **Bisa ditelusuri** — audit log + daftar baris gagal + fitur re-import.
```
