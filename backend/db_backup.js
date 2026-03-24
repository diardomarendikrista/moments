const userRepository = require('./repositories/user.repository');
const albumRepository = require('./repositories/album.repository');
const mediaRepository = require('./repositories/media.repository');
const fs = require('fs');
const path = require('path');

const backupData = async () => {
  try {
    console.log('--- Starting DB Backup ---');

    const users = await userRepository.getAllUsersFull();
    const albums = await albumRepository.getAllAlbumsWithCategories();
    const media = await mediaRepository.getMedia();

    const dump = {
      timestamp: new Date().toISOString(),
      users: users,
      albums: albums,
      media: media
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
