const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const dbUtils = require('./db.utils');
const driveService = require('../services/driveService');

const CRON_CONFIG = {
  // Jadwal backup (Cron format)
  // '0 */12 * * *' -> Setiap 12 jam
  // '0 */6 * * *'  -> Setiap 6 jam
  // '0 0 * * *'    -> Setiap 24 jam (tengah malam)
  BACKUP_SCHEDULE: '0 */12 * * *',

  // Berapa hari backup disimpan di Drive
  RETENTION_DAYS: 14
};

const initCron = () => {
  // AUTO-BACKUP
  cron.schedule(CRON_CONFIG.BACKUP_SCHEDULE, async () => {
    console.log(`Running scheduled backup (Interval: ${CRON_CONFIG.BACKUP_SCHEDULE})`);
    const now = new Date();
    const dateStr = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      '_' + String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0');

    const backupFileName = `backup_moments_${dateStr}.json`;
    const backupPath = path.join(__dirname, '..', backupFileName);

    try {
      const backupData = await dbUtils.getBackupData();
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

      // Upload to Drive
      console.log('Uploading backup to Google Drive...');
      await driveService.uploadBackup(backupPath, backupFileName);
      console.log('Backup uploaded successfully');

      // Run Cleanup
      await driveService.cleanupOldBackups(CRON_CONFIG.RETENTION_DAYS);

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
