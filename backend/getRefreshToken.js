const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const destroyer = require('server-destroy');
require('dotenv').config();

// PASTIKAN ANDA SUDAH MENGISI CLIENT ID DAN SECRET DI .env SEBELUM MENJALANKAN INI!
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = 'http://localhost:3000/oauth2callback';

if (!clientId || !clientSecret) {
  console.error("❌ ERROR: Tolong masukkan GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET ke file .env terlebih dahulu!");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri
);

const scopes = ['https://www.googleapis.com/auth/drive'];

async function getRefreshToken() {
  return new Promise((resolve, reject) => {
    // Jalankan server sementara di port 3000 untuk menangkap callback dari Google
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url.indexOf('/oauth2callback') > -1) {
          const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
          res.end('Otentikasi berhasil! Silakan tutup tab browser ini dan lihat terminal Anda.');
          server.destroy();
          const { tokens } = await oauth2Client.getToken(qs.get('code'));
          oauth2Client.credentials = tokens;
          resolve(tokens.refresh_token);
        }
      } catch (e) {
        reject(e);
      }
    }).listen(3000, () => {
      // Generate URL Autentikasi
      const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Meminta Refresh Token!
        scope: scopes,
        prompt: 'consent' // Memaksa muncul halaman consent untuk memastikan refresh token keluar
      });
      console.log('====================================================');
      console.log('🔗 BUKA LINK DI BAWAH INI DI BROWSER ANDA:');
      console.log(authorizeUrl);
      console.log('====================================================');
    });
    destroyer(server);
  });
}

getRefreshToken()
  .then((refreshToken) => {
    console.log('✅ BERHASIL MENDAPATKAN REFRESH TOKEN!');
    console.log('Tambahkan baris ini ke dalam file .env Anda:');
    console.log(`GOOGLE_REFRESH_TOKEN=${refreshToken}`);
    process.exit();
  })
  .catch((err) => {
    console.error('Gagal mendapatkan token:', err);
    process.exit(1);
  });
