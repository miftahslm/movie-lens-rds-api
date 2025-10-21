require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware keamanan dan performa
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Cache agar query cepat
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Konfigurasi Cloudflare R2 (pakai SDK Amazon S3)
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Fungsi download file database dari R2 ke lokal
async function downloadDatabase() {
  const filePath = path.join(__dirname, process.env.R2_FILE_NAME);
  if (fs.existsSync(filePath)) {
    console.log("✅ Database lokal sudah ada, tidak perlu download ulang.");
    return filePath;
  }

  console.log("⬇️ Mengunduh database dari Cloudflare R2...");
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: process.env.R2_FILE_NAME,
  });
  const response = await r2.send(command);
  const fileStream = fs.createWriteStream(filePath);

  await new Promise((resolve, reject) => {
    response.Body.pipe(fileStream);
    response.Body.on("error", reject);
    fileStream.on("finish", resolve);
  });

  console.log("✅ Database berhasil diunduh dari R2!");
  return filePath;
}

// Fungsi buka koneksi ke SQLite (read-only)
let db;
async function connectToDatabase() {
  const dbPath = await downloadDatabase();
  db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) console.error("❌ Gagal membuka DB:", err.message);
    else console.log("✅ Terhubung ke database (RDS - read-only)");
  });
}

// Pagination helper
const paginate = (page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  return { limit, offset };
};

// Endpoint ambil daftar film
app.get('/movies', (req, res) => {
  const { page = 1, limit = 50, search = "" } = req.query;
  const { offset } = paginate(page, limit);
  const cacheKey = `movies_${page}_${limit}_${search}`;

  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const query = `%${search}%`;
  db.all(
    `SELECT * FROM movies WHERE title LIKE ? LIMIT ? OFFSET ?`,
    [query, limit, offset],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      cache.set(cacheKey, rows);
      res.json(rows);
    }
  );
});

// Jalankan server setelah koneksi DB siap
connectToDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  });
});
