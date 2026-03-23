# moments

## Restore Database

1. PENTING: Di Postgres server baru, buat database kosong dulu: CREATE DATABASE moments;
2. Copy File: Pindahkan file .json hasil backup ke folder backend di server baru.
3. Run Restore: Jalankan perintah berikut di terminal: npm run restore moments_backup_xxxx.json
