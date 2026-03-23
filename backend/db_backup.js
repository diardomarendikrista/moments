const db = require('./db');
const fs = require('fs');
const path = require('path');

const backupData = async () => {
  try {
    console.log('--- Starting DB Backup ---');
    
    // 1. Fetch Users
    const usersRes = await db.query('SELECT username, password, role, name FROM users;');
    
    // 2. Fetch Albums
    const albumsRes = await db.query('SELECT name, description, categories FROM albums;');
    
    // 3. Fetch Media
    const mediaRes = await db.query('SELECT * FROM media;');
    
    const dump = {
      timestamp: new Date().toISOString(),
      users: usersRes.rows,
      albums: albumsRes.rows,
      media: mediaRes.rows
    };
    
    const fileName = `moments_backup_${new Date().toISOString().split('T')[0]}.json`;
    const filePath = path.join(__dirname, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(dump, null, 2));
    
    console.log(`--- Backup Success: ${fileName} ---`);
    console.log(`Path: ${filePath}`);
    process.exit(0);
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
};

backupData();
