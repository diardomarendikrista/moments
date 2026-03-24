const dbUtils = require('../utils/db.utils');
const userRepository = require('../repositories/user.repository');
const albumRepository = require('../repositories/album.repository');
const mediaRepository = require('../repositories/media.repository');
const fs = require('fs');

const exportDb = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const backup = await dbUtils.getBackupData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=moments_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Export failed' });
  }
};

const importDb = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const data = JSON.parse(fs.readFileSync(req.file.path, 'utf8'));
    console.log('--- Starting GUI DB Restore ---');

    for (const u of (data.users || [])) {
      await userRepository.upsertUser(u);
    }

    for (const a of (data.albums || [])) {
      // Need a full upsert for album with description
      const db = require('../config/db.config');
      await db.query(
        'INSERT INTO albums (name, description, categories) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET description=$2, categories=$3',
        [a.name, a.description, JSON.stringify(a.categories)]
      );
    }

    const db = require('../config/db.config');
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

    try { fs.unlinkSync(req.file.path); } catch (e) { }
    res.status(200).json({ message: 'Database restored successfully' });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ message: 'Import failed', error: error.message });
  }
};

module.exports = {
  exportDb,
  importDb
};
