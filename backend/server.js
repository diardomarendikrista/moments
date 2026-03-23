const express = require('express');
const cors = require('cors');
const multer = require('multer');
const archiver = require('archiver');
const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const driveService = require('./driveService');
const jwt = require('jsonwebtoken');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
app.use(cors());
app.use(express.json());

// Use multer for multipart/form-data
const upload = multer({ dest: 'uploads/' });

// Initialize schema on startup
db.initSchema();

// Health Check (Mendukung /, /api, dan /api/health)
app.get(['/', '/api', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Moments API is running' });
});

// --- AUTH MIDDLEWARE & ROUTES ---

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Authentication required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) req.user = user;
    next();
  });
};

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, name: user.name }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// --- PROTECTED ROUTES ---
// Apply authentication to all following routes except the ones above
// If you want some routes to be absolutely public, place them above this line.

// --- MEDIA CRUD ---
// Upload and Delete Media allowed for admin and editor (sub-admin)
app.post('/api/media/upload', authenticateToken, upload.array('files'), async (req, res) => {
  try {
    const { album_name, year, category } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded.' });
    }

    // 1. SEKUENSIL: Resolve Dulu ID Folder persis SATU KALI sebelum masuk ke antrian upload paralel.
    // Hal ini menghindari error banyak folder duplikat jika 10 foto diupload bersamaan karena
    // Promise.all menyebabkan 'Race Condition' di pencarian folder Gdrive (500 Error).
    console.log('Resolving folder for:', album_name, '-', year, '-', category);
    const targetFolderId = await driveService.getTargetFolderId(album_name, year, category);

    const uploadPromises = files.map(async (file) => {
      // 2. Upload to Drive paralel
      const driveRes = await driveService.uploadFile(
        file.path,
        file.mimetype,
        file.originalname,
        targetFolderId
      );

      console.log('Inserting media into DB:', file.originalname);
      const insertQuery = `
        INSERT INTO media (drive_file_id, album_name, year, category, file_name, mime_type, thumbnail_link, web_view_link, download_link_hd, width, height)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
      `;
      const values = [
        driveRes.id,
        album_name,
        parseInt(year),
        category,
        file.originalname,
        file.mimetype,
        driveRes.thumbnailLink,
        driveRes.webViewLink,
        driveRes.webContentLink,
        (driveRes.imageMediaMetadata?.width || driveRes.videoMediaMetadata?.width || null),
        (driveRes.imageMediaMetadata?.height || driveRes.videoMediaMetadata?.height || null)
      ];

      const dbRes = await db.query(insertQuery, values);
      return dbRes.rows[0];
    });

    const dbResults = await Promise.all(uploadPromises);

    // Sync to albums table: Ensure album and category exist
    const upsertAlbumQuery = `
      INSERT INTO albums (name, categories)
      VALUES ($1, jsonb_build_array(jsonb_build_object('year', $2::int, 'category', $3::text)))
      ON CONFLICT (name) DO UPDATE 
      SET categories = COALESCE((
        SELECT jsonb_agg(distinct_elems)
        FROM (
          SELECT DISTINCT jsonb_array_elements(albums.categories || jsonb_build_array(jsonb_build_object('year', $2::int, 'category', $3::text))) as distinct_elems
        ) sub
      ), '[]'::jsonb);
    `;
    await db.query(upsertAlbumQuery, [album_name, parseInt(year), category]);

    // Cleanup local files
    files.forEach((file) => {
      try { fs.unlinkSync(file.path); } catch (e) { }
    });

    res.status(200).json({ message: 'Upload successful', data: dbResults });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// READ (Get files optionally filtered by Album, Year, Category)
app.get('/api/media', optionalAuthenticate, async (req, res) => {
  try {
    const { album, year, category } = req.query;
    let query = 'SELECT * FROM media';
    let params = [];
    let conditions = [];

    if (album) { params.push(album); conditions.push(`album_name = $${params.length}`); }
    if (year) { params.push(year); conditions.push(`year = $${params.length}`); }
    if (category) { params.push(category); conditions.push(`category = $${params.length}`); }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';
    const dbRes = await db.query(query, params);

    res.status(200).json({ data: dbRes.rows });
  } catch (error) {
    console.error('Read error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// UPDATE (Edit Metadata and Move)
app.put('/api/media/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { album_name, year, category } = req.body;

    const getMedia = await db.query('SELECT drive_file_id FROM media WHERE id = $1', [id]);
    if (getMedia.rowCount === 0) return res.status(404).json({ message: 'Not found' });
    const drive_file_id = getMedia.rows[0].drive_file_id;

    const newFolderId = await driveService.getTargetFolderId(album_name, year, category);
    await driveService.moveFile(drive_file_id, newFolderId);

    // Update DB
    const query = `
      UPDATE media 
      SET album_name = $1, year = $2, category = $3
      WHERE id = $4
      RETURNING *;
    `;
    const values = [album_name, year, category, id];
    const dbRes = await db.query(query, values);

    if (dbRes.rowCount === 0) {
      return res.status(404).json({ message: 'Media not found' });
    }

    res.status(200).json({ message: 'Metadata updated', data: dbRes.rows[0] });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// GET ALBUMS (List folders from DB)
app.get('/api/albums', optionalAuthenticate, async (req, res) => {
  try {
    const dbRes = await db.query('SELECT name FROM albums ORDER BY name ASC;');
    res.status(200).json({ data: dbRes.rows.map(r => r.name) });
  } catch (error) {
    console.error('Fetch albums error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// GET ALL ALBUMS WITH CATEGORIES (For Modals/Dropdowns)
app.get('/api/albums/all', optionalAuthenticate, async (req, res) => {
  try {
    const dbRes = await db.query('SELECT name, categories FROM albums ORDER BY name ASC;');
    res.status(200).json({ data: dbRes.rows });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// GET CATEGORIES (List year+category for an album from DB)
app.get('/api/albums/:album_name/categories', optionalAuthenticate, async (req, res) => {
  try {
    const { album_name } = req.params;
    const dbRes = await db.query('SELECT categories FROM albums WHERE name = $1', [album_name]);

    if (dbRes.rowCount === 0) {
      return res.status(200).json({ data: [] });
    }

    let categories = dbRes.rows[0].categories || [];
    // Sort categories (Year DESC, Category ASC)
    categories.sort((a, b) => b.year - a.year || a.category.localeCompare(b.category));

    res.status(200).json({ data: categories });
  } catch (error) {
    console.error('Fetch categories error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// FOLDER CRUD: ADD EMPTY CATEGORY
app.post('/api/folders/add', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'editor') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { albumName, year, category } = req.body;
  if (!albumName || !year || !category) {
    return res.status(400).json({ message: 'Album, Year, and Category are required' });
  }

  try {
    const upsertAlbumQuery = `
      INSERT INTO albums (name, categories)
      VALUES ($1, jsonb_build_array(jsonb_build_object('year', $2::int, 'category', $3::text)))
      ON CONFLICT (name) DO UPDATE 
      SET categories = COALESCE((
        SELECT jsonb_agg(distinct_elems)
        FROM (
          SELECT DISTINCT jsonb_array_elements(albums.categories || jsonb_build_array(jsonb_build_object('year', $2::int, 'category', $3::text))) as distinct_elems
        ) sub
      ), '[]'::jsonb);
    `;
    await db.query(upsertAlbumQuery, [albumName, parseInt(year), category]);
    res.status(200).json({ message: 'Folder added successfully' });
  } catch (error) {
    console.error('Add folder error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// FOLDER CRUD: RENAME
app.put('/api/folders/rename', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'editor') {
    return res.status(403).json({ message: 'Access denied: Admin or Editor only' });
  }
  try {
    const { renameType, oldName, newName, albumName, year, category } = req.body;

    // Find target in drive
    const targetFolderId = await driveService.getFolderIdOnly(
      renameType === 'album' ? oldName : albumName,
      renameType === 'category' ? year : null,
      renameType === 'category' ? oldName : null
    );

    if (targetFolderId) {
      await driveService.renameFolder(targetFolderId, newName);
    }

    // Sync to DB
    if (renameType === 'album') {
      await db.query('UPDATE media SET album_name = $1 WHERE album_name = $2', [newName, oldName]);
      await db.query('UPDATE albums SET name = $1 WHERE name = $2', [newName, oldName]);
    } else if (renameType === 'category') {
      await db.query('UPDATE media SET category = $1 WHERE album_name = $2 AND year = $3 AND category = $4', [newName, albumName, year, oldName]);

      // Update JSONB categories: replace matching year/category object
      const updateCatQuery = `
        UPDATE albums 
        SET categories = COALESCE((
          SELECT jsonb_agg(
            CASE 
              WHEN (elem->>'year')::int = $3::int AND elem->>'category' = $4::text
              THEN jsonb_build_object('year', $3::int, 'category', $1::text) 
              ELSE elem 
            END
          )
          FROM jsonb_array_elements(categories) elem
        ), '[]'::jsonb)
        WHERE name = $2;
      `;
      await db.query(updateCatQuery, [newName, albumName, year, oldName]);
    }

    res.status(200).json({ message: 'Folder renamed successfully' });
  } catch (err) {
    console.error('Rename folder error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
});

// FOLDER CRUD: DELETE
app.delete('/api/folders/delete', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin only' });
  }
  try {
    const { deleteType, albumName, year, category } = req.body;

    const targetFolderId = await driveService.getFolderIdOnly(albumName, deleteType === 'category' ? year : null, deleteType === 'category' ? category : null);

    if (targetFolderId) {
      await driveService.deleteFile(targetFolderId); // Deletes recursively
    }

    if (deleteType === 'album') {
      await db.query('DELETE FROM media WHERE album_name = $1', [albumName]);
      await db.query('DELETE FROM albums WHERE name = $1', [albumName]);
    } else if (deleteType === 'category') {
      await db.query('DELETE FROM media WHERE album_name = $1 AND year = $2 AND category = $3', [albumName, year, category]);

      // Remove from JSONB categories
      const removeCatQuery = `
        UPDATE albums 
        SET categories = COALESCE((
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements(categories) elem
          WHERE (elem->>'year')::int != $2::int OR elem->>'category' != $3::text
        ), '[]'::jsonb)
        WHERE name = $1;
      `;

      await db.query(removeCatQuery, [albumName, parseInt(year), category]);
    }

    res.status(200).json({ message: 'Folder and contents permanently deleted' });
  } catch (err) {
    console.error('Delete folder error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
});

// BULK DELETE
app.post('/api/media/bulk-delete', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || ids.length === 0) return res.status(400).json({ message: 'No IDs provided' });

    // Prepare placeholders for IN clause
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const query = `SELECT id, drive_file_id FROM media WHERE id IN (${placeholders})`;
    const selectRes = await db.query(query, ids);

    if (selectRes.rowCount === 0) {
      return res.status(404).json({ message: 'Files not found' });
    }

    // 1. Delete from Drive concurrently
    const deletePromises = selectRes.rows.map(record => driveService.deleteFile(record.drive_file_id));
    await Promise.all(deletePromises);

    // 2. Delete from Postgres
    await db.query(`DELETE FROM media WHERE id IN (${placeholders})`, ids);

    res.status(200).json({ message: 'Bulk delete successful' });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// DELETE (Delete from DB and Drive)
app.delete('/api/media/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get Drive File ID from DB
    const selectQuery = 'SELECT drive_file_id FROM media WHERE id = $1';
    const selectRes = await db.query(selectQuery, [id]);

    if (selectRes.rowCount === 0) {
      return res.status(404).json({ message: 'Media not found in DB' });
    }

    const driveFileId = selectRes.rows[0].drive_file_id;

    // 2. Delete from Drive
    await driveService.deleteFile(driveFileId);

    // 3. Delete from DB
    const deleteQuery = 'DELETE FROM media WHERE id = $1';
    await db.query(deleteQuery, [id]);

    res.status(200).json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// STREAM (Direct proxy fallback for broken Drive thumbnails)
app.get('/api/media/:id/stream', async (req, res) => {
  try {
    const { id } = req.params;
    const { download } = req.query;
    const dbRes = await db.query('SELECT drive_file_id, mime_type, file_name FROM media WHERE id = $1', [id]);
    if (dbRes.rowCount === 0) return res.status(404).json({ message: 'Not found' });

    const { drive_file_id, mime_type, file_name } = dbRes.rows[0];
    const range = req.headers.range;

    // Generate fresh Bearer Token
    const tokenOptions = await driveService.oauth2Client.getAccessToken();
    const token = tokenOptions.token;

    const fetchOptions = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    if (range) fetchOptions.headers['Range'] = range;

    // Use Native Node fetch to bypass all wrapper header-stripping logic
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${drive_file_id}?alt=media`, fetchOptions);

    if (!driveRes.ok) {
      throw new Error(`Drive fetch failed with status ${driveRes.status}`);
    }

    res.status(driveRes.status);

    // Copy literally all raw web headers
    for (const [key, value] of driveRes.headers.entries()) {
      if (key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    }

    if (download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${file_name}"`);
    }

    res.setHeader('Content-Type', mime_type);
    res.setHeader('Accept-Ranges', 'bytes');

    // Close connection hook for Web Streams
    req.on('close', () => {
      try {
        if (driveRes.body && typeof driveRes.body.cancel === 'function') {
          driveRes.body.cancel().catch(() => { });
        }
      } catch (e) { }
    });

    const { Readable } = require('stream');
    const readable = Readable.fromWeb(driveRes.body);

    readable.on('error', (err) => {
      console.error('Native Fetch Stream Pipe Error:', err.message);
      if (!res.headersSent) res.status(500).end();
    });

    readable.pipe(res);

  } catch (error) {
    console.error('Drive stream fetch error:', error.message);
    if (!res.headersSent) res.status(500).end();
  }
});

// BULK DOWNLOAD (ZIP)
app.post('/api/media/download-zip', optionalAuthenticate, async (req, res) => {
  try {
    const { ids } = req.body; // Array of IDs
    if (!ids || !ids.length) {
      return res.status(400).json({ message: 'No IDs provided' });
    }

    // Prepare placeholders for query
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const query = `SELECT drive_file_id, file_name FROM media WHERE id IN (${placeholders})`;
    const selectRes = await db.query(query, ids);

    if (selectRes.rowCount === 0) {
      return res.status(404).json({ message: 'Files not found' });
    }

    // Set headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Moments_Backup.zip"');

    // Setup Archiver
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });

    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      // Ensure we don't crash
      res.status(500).end();
    });

    // Pipe archive data to the response
    archive.pipe(res);

    // Append files to the archive stream
    for (const record of selectRes.rows) {
      const stream = await driveService.getFileStream(record.drive_file_id);
      archive.append(stream, { name: record.file_name });
    }

    // Finalize the archive (i.e. we are done appending files but streams have to finish yet)
    await archive.finalize();

  } catch (error) {
    console.error('Zip download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
});

// AUTO-BACKUP (Cron job every day at 02:00)
cron.schedule('0 2 * * *', () => {
  console.log('Running daily backup at 02:00 AM');
  const backupFileName = `backup_moments_${Date.now()}.sql.gz`;
  const backupPath = path.join(__dirname, backupFileName);

  // Set password via env for pg_dump
  const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD };

  // Create compressed backup
  const cmd = `pg_dump -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} ${process.env.DB_NAME} | gzip > ${backupPath}`;

  exec(cmd, { env }, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup exec error: ${error}`);
      return;
    }

    try {
      // Upload to Drive
      console.log('Uploading backup to Google Drive...');
      await driveService.uploadBackup(backupPath, backupFileName);
      console.log('Backup uploaded successfully');

      // Clean up local
      fs.unlink(backupPath, (err) => {
        if (err) console.error('Failed to clear local backup copy:', err);
      });
    } catch (uploadError) {
      console.error('Failed to upload backup to Drive:', uploadError);
    }
  });
});

const PORT = process.env.PORT || 5000;
// ADMIN: DATABASE EXPORT
app.get('/api/admin/db/export', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const users = await db.query('SELECT username, password, role, name FROM users;');
    const albums = await db.query('SELECT name, description, categories FROM albums;');
    const media = await db.query('SELECT * FROM media;');

    const backup = {
      timestamp: new Date().toISOString(),
      users: users.rows,
      albums: albums.rows,
      media: media.rows
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=moments_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Export failed' });
  }
});

// ADMIN: DATABASE IMPORT (RESTORE)
app.post('/api/admin/db/import', authenticateToken, upload.single('file'), async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const data = JSON.parse(fs.readFileSync(req.file.path, 'utf8'));
    console.log('--- Starting GUI DB Restore ---');

    // 1. Restore Users
    for (const u of (data.users || [])) {
      await db.query(
        'INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO UPDATE SET password=$2, role=$3, name=$4',
        [u.username, u.password, u.role, u.name]
      );
    }

    // 2. Restore Albums
    for (const a of (data.albums || [])) {
      await db.query(
        'INSERT INTO albums (name, description, categories) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET description=$2, categories=$3',
        [a.name, a.description, JSON.stringify(a.categories)]
      );
    }

    // 3. Restore Media
    for (const m of (data.media || [])) {
      const { id, created_at, ...mdata } = m;
      const columns = Object.keys(mdata).join(', ');
      const placeholders = Object.keys(mdata).map((_, i) => `$${i + 1}`).join(', ');
      const values = Object.values(mdata);

      await db.query(
        `INSERT INTO media (drive_file_id, ${columns.replace('drive_file_id, ', '')}) 
         VALUES (${placeholders}) 
         ON CONFLICT (drive_file_id) DO NOTHING`,
        values
      );
    }

    // Cleanup uploaded file
    try { fs.unlinkSync(req.file.path); } catch (e) { }

    console.log('--- GUI Restore Success ---');
    res.status(200).json({ message: 'Database restored successfully' });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ message: 'Import failed', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
