const mediaRepository = require('../repositories/media.repository');
const albumRepository = require('../repositories/album.repository');
const driveService = require('./driveService');
const fs = require('fs');
const archiver = require('archiver');
const { Readable } = require('stream');
const { compressImage } = require('../utils/image.utils');

const uploadMedia = async (files, album_name, year, category) => {
  if (!files || files.length === 0) {
    throw new Error('No files uploaded.');
  }

  const targetFolderId = await driveService.getTargetFolderId(album_name, year, category);

  const uploadPromises = files.map(async (file) => {
    // Compress image if it's an image file
    const compressedPath = await compressImage(file.path, file.mimetype);

    const driveRes = await driveService.uploadFile(
      compressedPath,
      file.mimetype,
      file.originalname,
      targetFolderId
    );

    const mediaData = {
      drive_file_id: driveRes.id,
      album_name,
      year: parseInt(year),
      category,
      file_name: file.originalname,
      mime_type: file.mimetype,
      thumbnail_link: driveRes.thumbnailLink,
      web_view_link: driveRes.webViewLink,
      download_link_hd: driveRes.webContentLink,
      width: (driveRes.imageMediaMetadata?.width || driveRes.videoMediaMetadata?.width || null),
      height: (driveRes.imageMediaMetadata?.height || driveRes.videoMediaMetadata?.height || null),
      size_bytes: parseInt(driveRes.size) || null
    };

    const media = await mediaRepository.createmedia(mediaData);

    // Cleanup local file
    try { fs.unlinkSync(file.path); } catch (e) { }

    return media;
  });

  const dbResults = await Promise.all(uploadPromises);

  // Sync to albums table
  await albumRepository.upsertAlbumCategory(album_name, year, category);

  return dbResults;
};

const bulkDelete = async (ids) => {
  if (!ids || ids.length === 0) throw new Error('No IDs provided');

  const mediaList = await mediaRepository.getMediaByIds(ids);
  if (mediaList.length === 0) throw new Error('Files not found');

  const deletePromises = mediaList.map(m => driveService.deleteFile(m.drive_file_id));
  await Promise.all(deletePromises);

  await mediaRepository.deleteMediaByIds(ids);
  return { success: true };
};

const deleteMedia = async (id) => {
  const media = await mediaRepository.getMediaById(id);
  if (!media) throw new Error('Media not found in DB');

  await driveService.deleteFile(media.drive_file_id);
  await mediaRepository.deleteMedia(id);
  return { success: true };
};

const getStreamData = async (id) => {
  const media = await mediaRepository.getMediaById(id);
  if (!media) throw new Error('Not found');

  const tokenOptions = await driveService.oauth2Client.getAccessToken();
  return {
    media,
    accessToken: tokenOptions.token
  };
};

const generateZipStream = async (ids, res) => {
  const mediaList = await mediaRepository.getMediaByIds(ids);
  if (mediaList.length === 0) throw new Error('Files not found');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  for (const record of mediaList) {
    const stream = await driveService.getFileStream(record.drive_file_id);
    archive.append(stream, { name: record.file_name });
  }

  await archive.finalize();
};

module.exports = {
  uploadMedia,
  bulkDelete,
  deleteMedia,
  getStreamData,
  generateZipStream
};
