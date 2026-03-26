# Moments Project (v1.2.0)

Aplikasi manajemen media pribadi yang terintegrasi dengan Google Drive dan PostgreSQL. Proyek ini sekarang menggunakan arsitektur modular **Controller-Service-Repository (CSR)** dan mendukung **HD Image Compression** otomatis.

## 📁 Struktur Proyek

- **[backend/](./backend/README.md)**: Server Node.js (Express) dengan arsitektur CSR. Berisi logika utama, integrasi Drive, dan manajemen database.
- **[frontend/](./frontend/README.md)**: Client React + Vite dengan tampilan Gallery yang responsif dan fitur Lightbox.

## 🚀 Memulai Cepat

### Backend

1. `cd backend`
2. `npm install`
3. Konfigurasi `.env` (Lihat Panduan di [README Backend](./backend/README.md))
4. `npm run dev`

### Frontend

1. `cd frontend`
2. `npm install`
3. Konfigurasi `.env` (Lihat Panduan di [README Frontend](./frontend/README.md))
4. `npm run dev`

## 🧪 Testing

Untuk menjalankan pengujian otomatis pada backend:

```bash
cd backend
npm test
```

## 📄 Lisensi

MIT
