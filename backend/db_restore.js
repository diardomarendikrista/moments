const userRepository = require('./repositories/user.repository');
const albumRepository = require('./repositories/album.repository');
const mediaRepository = require('./repositories/media.repository');
const dbUtils = require('./utils/db.utils');
const db = require('./config/db.config');
const fs = require('fs');
const path = require('path');

const restoreData = async () => {
  const args = process.argv.slice(2);
  const file = args[0];

  if (!file) {
    console.error('Please provide a backup file path: node db_restore.js <filename>');
    process.exit(1);
  }

  try {
    console.log(`--- Starting DB Restore from: ${file} ---`);
    const data = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));

    // 0. Ensure Schema exists
    console.log('Initializing schema...');
    await dbUtils.initSchema();

    // 1. Restore Users
    console.log('Restoring Users...');
    for (const u of data.users) {
      await userRepository.upsertUser(u);
    }

    // 2. Restore Albums
    console.log('Restoring Albums...');
    const pool = require('./config/db.config');
    for (const a of data.albums) {
      // Direct query for full album restoration (description field)
      await pool.query(
        'INSERT INTO albums (name, description, categories) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET description=$2, categories=$3',
        [a.name, a.description, JSON.stringify(a.categories)]
      );
    }

    // 3. Restore Media
    console.log('Restoring Media (this might take a while)...');
    for (const m of data.media) {
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

    console.log('--- Restore Success ---');
    process.exit(0);
  } catch (error) {
    console.error('Restore failed:', error);
    process.exit(1);
  }
};

restoreData();
