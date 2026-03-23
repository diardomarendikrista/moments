const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/oauth2callback'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });
const ROOT_FOLDER_ID = process.env.DRIVE_ROOT_ID;

const listSubfolders = async (parentId) => {
  const query = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    orderBy: 'name'
  });
  return res.data.files || [];
};

const resolveFolder = async (parentId, folderName) => {
  const query = `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await drive.files.list({ q: query, fields: 'files(id, name)' });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId],
  };
  const folderRes = await drive.files.create({
    resource: fileMetadata,
    fields: 'id',
  });
  return folderRes.data.id;
};

const getTargetFolderId = async (albumName, year, category) => {
  let currentParentId = ROOT_FOLDER_ID;
  currentParentId = await resolveFolder(currentParentId, albumName);
  currentParentId = await resolveFolder(currentParentId, year.toString());
  currentParentId = await resolveFolder(currentParentId, category);
  return currentParentId;
};

const getFolderIdOnly = async (albumName, year = null, category = null) => {
  let currentParentId = ROOT_FOLDER_ID;

  // Find Album
  const albumQuery = `'${currentParentId}' in parents and name = '${albumName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  let res = await drive.files.list({ q: albumQuery, fields: 'files(id)' });
  if (!res.data.files || res.data.files.length === 0) return null;
  currentParentId = res.data.files[0].id;

  if (!year) return currentParentId;

  // Find Year
  const yearQuery = `'${currentParentId}' in parents and name = '${year}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  res = await drive.files.list({ q: yearQuery, fields: 'files(id)' });
  if (!res.data.files || res.data.files.length === 0) return null;
  currentParentId = res.data.files[0].id;

  if (!category) return currentParentId;

  // Find Category
  const catQuery = `'${currentParentId}' in parents and name = '${category}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  res = await drive.files.list({ q: catQuery, fields: 'files(id)' });
  if (!res.data.files || res.data.files.length === 0) return null;

  return res.data.files[0].id;
};

const renameFolder = async (folderId, newName) => {
  await drive.files.update({
    fileId: folderId,
    resource: { name: newName }
  });
};

const uploadFile = async (filePath, mimeType, originalName, folderId) => {
  const fileMetadata = {
    name: originalName,
    parents: [folderId],
  };
  const media = {
    mimeType: mimeType,
    body: fs.createReadStream(filePath),
  };

  const res = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, name, thumbnailLink, webViewLink, webContentLink, imageMediaMetadata, videoMediaMetadata',
  });

  try {
    // Attempt to open permissions for public viewing
    await drive.permissions.create({
      fileId: res.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    // Usually fails if organization blocks it
  }

  return res.data;
};

const deleteFile = async (fileId) => {
  try {
    await drive.files.delete({ fileId });
  } catch (err) {
    console.error('Drive Delete Error for ID', fileId, err.message);
  }
};

const getFileStream = async (fileId) => {
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
  return res.data;
};

const uploadBackup = async (filePath, originalName) => {
  const backupFolderId = await resolveFolder(ROOT_FOLDER_ID, 'Backup_moment');
  const fileMetadata = { name: originalName, parents: [backupFolderId] };

  // Detect mimeType from extension
  let mimeType = 'application/gzip';
  if (originalName.endsWith('.json')) {
    mimeType = 'application/json';
  } else if (originalName.endsWith('.sql')) {
    mimeType = 'text/plain';
  }

  const media = { mimeType, body: fs.createReadStream(filePath) };
  const res = await drive.files.create({ resource: fileMetadata, media: media, fields: 'id, name' });
  return res.data;
};

const moveFile = async (fileId, newFolderId) => {
  try {
    const file = await drive.files.get({ fileId, fields: 'parents' });
    const previousParents = file.data.parents.join(',');
    await drive.files.update({
      fileId: fileId,
      addParents: newFolderId,
      removeParents: previousParents,
      fields: 'id, parents'
    });
  } catch (err) {
    console.error('Drive Move Error for ID', fileId, err.message);
    throw err;
  }
};

const listFiles = async (parentId) => {
  const query = `'${parentId}' in parents and trashed = false`;
  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name, createdTime)',
    orderBy: 'createdTime desc'
  });
  return res.data.files || [];
};

const cleanupOldBackups = async (daysLimit) => {
  try {
    const backupFolderId = await resolveFolder(ROOT_FOLDER_ID, 'Backup_moment');
    const files = await listFiles(backupFolderId);

    const now = new Date();
    const limit = new Date(now.getTime() - (daysLimit * 24 * 60 * 60 * 1000));

    console.log(`--- Checking for backups older than ${daysLimit} days ---`);
    for (const file of files) {
      const createdTime = new Date(file.createdTime);
      if (createdTime < limit) {
        console.log(`Deleting old backup: ${file.name} (uploaded at ${file.createdTime})`);
        await deleteFile(file.id);
      }
    }
    console.log('--- Cleanup finished ---');
  } catch (err) {
    console.error('Cleanup backups error:', err.message);
  }
};

module.exports = {
  drive,
  oauth2Client,
  getFolderIdOnly,
  renameFolder,
  getTargetFolderId,
  uploadFile,
  deleteFile,
  getFileStream,
  uploadBackup,
  moveFile,
  listSubfolders,
  cleanupOldBackups
};
