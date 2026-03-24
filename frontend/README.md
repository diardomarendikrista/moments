# Moments Frontend - React + Vite

Frontend untuk aplikasi Moments, dibangun menggunakan React 19, Vite, dan Tailwind CSS. Aplikasi ini dirancang untuk memberikan pengalaman galeri yang premium, responsif, dan interaktif.

## 🚀 Fitur Utama

- **Masonry & Grid Layout**: Tampilan koleksi foto yang dinamis dan rapi.
- **Advanced Lightbox**: Preview gambar resolusi penuh dan pemutar video terintegrasi.
- **Bulk Operations**: Download ZIP, download file sekuensial, dan penghapusan massal.
- **Responsive Design**: Antarmuka yang dioptimalkan untuk perangkat mobile maupun desktop.
- **Dark Mode Support**: Terintegrasi dengan tema sistem atau pilihan pengguna.

## 🛠️ Persyaratan

- Node.js v18+
- Backend Moments yang sudah berjalan

## 📦 Instalasi

1. Masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Konfigurasi file `.env`:
   - Copy file `.env.example` menjadi `.env`:
     ```bash
     cp .env.example .env
     ```
   - Isi `VITE_API_BASE_URL` dengan alamat API backend Anda. Contoh:
     ```env
     VITE_API_BASE_URL=http://localhost:5000/api
     ```

## 🏃 Menjalankan Aplikasi

- **Development**: `npm run dev`
- **Build Production**: `npm run build`
- **Preview Build**: `npm run preview`

## 📂 Struktur Folder

- `src/components/`: Komponen UI reusable (Modal, Button, dsb).
- `src/pages/`: Halaman utama aplikasi (Home, GalleryView, dsb).
- `src/context/`: State management (AuthContext).
- `src/lib/`: Utilitas (Tailwind merge, helper functions).
- `public/`: Aset statis.

## 🎨 Teknologi yang Digunakan

- **React 19**: Library UI modern.
- **Vite**: Build tool super cepat.
- **Tailwind CSS 4**: Styling utility-first.
- **Lucide React**: Set ikon yang cantik dan konsisten.
- **Axios**: Komunikasi dengan REST API.
