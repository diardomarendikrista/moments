const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const dbUtils = require('./db.utils');
const driveService = require('../services/driveService');

const initCron = () => {
  // AUTO-BACKUP (Cron job every 12 hours)
  cron.schedule('0 */12 * * *', async () => {
    console.log('Running scheduled backup (every 12 hours)');
    const backupFileName = `backup_moments_${Date.now()}.json`;
    const backupPath = path.join(__dirname, '..', backupFileName);

    try {
      const backupData = await dbUtils.getBackupData();
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

      // Upload to Drive
      console.log('Uploading backup to Google Drive...');
      await driveService.uploadBackup(backupPath, backupFileName);
      console.log('Backup uploaded successfully');

      // Run Cleanup (Keep last 14 days)
      await driveService.cleanupOldBackups(14);

      // Clean up local
      fs.unlink(backupPath, (err) => {
        if (err) console.error('Failed to clear local backup copy:', err);
      });
    } catch (error) {
      console.error('Auto-backup failed:', error);
    }
  });
};

module.exports = { initCron };
