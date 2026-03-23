const db = require('./db');
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
    await db.initSchema();

    // 1. Restore Users
    console.log('Restoring Users...');
    for (const u of data.users) {
      await db.query(
        'INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO UPDATE SET password=$2, role=$3, name=$4',
        [u.username, u.password, u.role, u.name]
      );
    }

    // 2. Restore Albums
    console.log('Restoring Albums...');
    for (const a of data.albums) {
      await db.query(
        'INSERT INTO albums (name, description, categories) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET description=$2, categories=$3',
        [a.name, a.description, JSON.stringify(a.categories)]
      );
    }

    // 3. Restore Media
    console.log('Restoring Media (this might take a while)...');
    // Clear existing media to avoid duplicates if ID is random? 
    // Usually, we want clean restore. Let's use INSERT ON CONFLICT drive_file_id.
    for (const m of data.media) {
      const { id, created_at, ...mdata } = m; // Skip auto-gen fields if they exist
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
