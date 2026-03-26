# Moments Backend - Modular CSR Architecture

Backend untuk aplikasi Moments yang menggunakan arsitektur **Controller-Service-Repository (CSR)**. Backend ini terintegrasi dengan Google Drive sebagai penyimpanan media utama dan PostgreSQL untuk metadata.

## 🚀 Fitur Utama

- **Modular CSR Architecture**: Pemisahan logika yang jelas antara handler (Controller), logika bisnis (Service), dan akses data (Repository).
- **Google Drive Integration**: Upload, download, streaming, dan manajemen folder langsung di Drive.
- **Automated Backup**: Backup database otomatis ke Google Drive setiap 12 jam.
- **HD Image Compression**: Kompresi gambar otomatis ala WhatsApp (HD quality) menggunakan library `sharp` dengan fitur anti-rotate (EXIF orientation).
- **Integration Testing**: Suite pengujian menggunakan Jest dan Supertest.
- **JWT Authentication**: Keamanan akses menggunakan JSON Web Token.

## 🛠️ Persyaratan

- Node.js v16+
- PostgreSQL
- Google Cloud Project (untuk Drive API)

## 📦 Instalasi

1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Copy file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
4. Isi variabel di dalam `.env` (Lihat panduan di bawah).

---

## 🔐 Panduan Konfigurasi .env

### 1. Database (PostgreSQL)

Isi detail koneksi database Anda:

- `DB_USER`: Username PostgreSQL (default: `postgres`)
- `DB_PASSWORD`: Password PostgreSQL
- `DB_HOST`: Host (default: `localhost`)
- `DB_PORT`: Port (default: `5432`)
- `DB_NAME`: Nama database (contoh: `moments`)

### 2. Google Drive API (PENTING)

Untuk mendapatkan kredensial Drive, ikuti langkah berikut:

#### A. Membuat Project di Google Cloud

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat Project baru atau pilih yang sudah ada.
3. Buka **APIs & Services > Library**, cari **Google Drive API**, dan klik **Enable**.
4. Buka **OAuth consent screen**:
   - Pilih **External**.
   - Isi User support email dan Developer contact info.
   - Pada bagian **Scopes**, tambahkan `.../auth/drive` (Full access to all Drive files).
   - Tambahkan email Anda ke **Test users** (Wajib jika statusnya masih Testing).

#### B. Mendapatkan Client ID & Secret

1. Buka **APIs & Services > Credentials**.
2. Klik **Create Credentials > OAuth client ID**.
3. Pilih Application type: **Web application**.
4. Di bagian **Authorized redirect URIs**, tambahkan: `http://localhost:3000/oauth2callback`
5. Klik Create, lalu simpan:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

#### C. Mendapatkan Refresh Token

1. Isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` ke file `.env`.
2. Jalankan skrip pembantu untuk mendapatkan refresh token:
   ```bash
   node getRefreshToken.js
   ```
3. Klik link yang muncul di terminal, login dengan akun Google Anda.
4. Salin `GOOGLE_REFRESH_TOKEN` yang muncul di terminal ke file `.env`.

#### D. Root Folder ID

1. Buat folder di Google Drive yang akan menjadi root penyimpanan Moments.
2. Buka folder tersebut di browser, ambil ID-nya dari URL (string setelah `folders/`).
3. Masukkan ke `DRIVE_ROOT_ID` di file `.env`.

---

## 🏃 Menjalankan Aplikasi

- **Development**: `npm run dev` (dengan nodemon)
- **Production**: `npm start`
- **Backup Manual**: `node db_backup.js`
- **Restore Manual**: `node db_restore.js <path_to_file>`

## 🧪 Testing

Jalankan semua test suite untuk memastikan sistem berjalan normal:

```bash
npm test
```

---

## 🚛 Panduan Migrasi (Pindah Server)

Jika Anda memindahkan aplikasi ini ke server baru, ikuti langkah langkah berikut:

1. **Persiapan Database**: Di server PostgreSQL yang baru, buat database kosong terlebih dahulu:
   ```bash
   CREATE DATABASE moments;
   ```
2. **Pemindahan Data**: Pindahkan file hasil backup (format `.json`) dari server lama ke folder `backend/` di server baru.
3. **Jalankan Restore**: Jalankan perintah berikut di terminal:
   ```bash
   # Ganti dengan nama file backup asli Anda
   npm run restore moments_backup_xxxx.json
   ```

---

## 📡 Dokumentasi API (Endpoint Reference)

Berikut adalah ringkasan API dengan contoh request dan response.

### 1. Authentication

#### **POST /api/auth/login**

Mendapatkan token akses.

- **Body**:
  ```json
  { "username": "admin", "password": "yourpassword" }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "name": "Admin User"
    }
  }
  ```

---

### 2. Media Management

#### **GET /api/media**

Mengambil daftar media dengan filter.

- **Query Params**: `album`, `year`, `category`.
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "file_name": "photo.jpg",
        "thumbnail_link": "http...",
        "created_at": "2024-03-24"
      }
    ]
  }
  ```

#### **POST /api/media/upload**

Upload media baru (Multipart/form-data).

- **Body**: `album_name`, `year`, `category` (string), `files` (file binary).
- **Response (200 OK)**:
  ```json
  { "message": "Upload successful", "data": [ ... ] }
  ```

#### **POST /api/media/bulk-delete**

Menghapus banyak media.

- **Body**:
  ```json
  { "ids": [1, 2, 3] }
  ```

---

### 3. Albums & Folders

#### **GET /api/albums/all**

Daftar semua album dan kategorinya.

- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "name": "Wedding",
        "categories": [{ "year": 2023, "category": "General" }]
      }
    ]
  }
  ```

#### **POST /api/folders/add**

Membuat folder baru.

- **Body**:
  ```json
  { "albumName": "Wedding", "year": "2024", "category": "Events" }
  ```
- **Response (200 OK)**:
  ```json
  { "message": "Folder added successfully" }
  ```

---

### 4. Admin (Database Backup)

#### **GET /api/admin/db/export**

Download database dalam format JSON.

- **Response**: File `moments_backup_YYYY-MM-DD.json`.

---

## 📂 Struktur Folder

- `config/`: Konfigurasi database pool.
- `controllers/`: Menangani request HTTP dan mengirim response.
- `services/`: Berisi logika bisnis utama (Drive API, logic kompleks).
- `repositories/`: Berisi query database langsung ke PostgreSQL.
- `routes/`: Definisi endpoint API.
- `middlewares/`: Autentikasi dan file upload (Multer).
- `utils/`: Skrip pembantu (Initialize DB, Cron Jobs).
- `tests/`: Kumpulan file integrasi test.
