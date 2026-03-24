const mediaService = require('../services/media.service');
const mediaRepository = require('../repositories/media.repository');

const getMedia = async (req, res) => {
  try {
    const { album, year, category } = req.query;
    const data = await mediaRepository.getMedia({ album, year, category });
    res.status(200).json({ data });
  } catch (error) {
    console.error('Read error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

const uploadMedia = async (req, res) => {
  try {
    const { album_name, year, category } = req.body;
    const files = req.files;
    const data = await mediaService.uploadMedia(files, album_name, year, category);
    res.status(200).json({ message: 'Upload successful', data });
  } catch (error) {
    console.error('Upload error:', error);
    const status = error.message === 'No files uploaded.' ? 400 : 500;
    res.status(status).json({ message: error.message || 'Internal Server Error' });
  }
};

const updateMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { album_name, year, category } = req.body;

    // Logic from server.js involves drive move
    const driveService = require('../services/driveService');
    const media = await mediaRepository.getMediaById(id);
    if (!media) return res.status(404).json({ message: 'Not found' });

    const newFolderId = await driveService.getTargetFolderId(album_name, year, category);
    await driveService.moveFile(media.drive_file_id, newFolderId);

    const updated = await mediaRepository.updateMedia(id, { album_name, year, category });
    res.status(200).json({ message: 'Metadata updated', data: updated });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    await mediaService.bulkDelete(ids);
    res.status(200).json({ message: 'Bulk delete successful' });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    await mediaService.deleteMedia(id);
    res.status(200).json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

const streamMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { download } = req.query;
    const { media, accessToken } = await mediaService.getStreamData(id);

    const range = req.headers.range;
    const fetchOptions = {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    };
    if (range) fetchOptions.headers['Range'] = range;

    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${media.drive_file_id}?alt=media`, fetchOptions);
    if (!driveRes.ok) throw new Error(`Drive fetch failed with status ${driveRes.status}`);

    res.status(driveRes.status);
    for (const [key, value] of driveRes.headers.entries()) {
      if (key.toLowerCase() !== 'transfer-encoding') res.setHeader(key, value);
    }

    if (download === '1') res.setHeader('Content-Disposition', `attachment; filename="${media.file_name}"`);
    res.setHeader('Content-Type', media.mime_type);
    res.setHeader('Accept-Ranges', 'bytes');

    req.on('close', () => {
      if (driveRes.body && typeof driveRes.body.cancel === 'function') driveRes.body.cancel().catch(() => { });
    });

    const { Readable } = require('stream');
    Readable.fromWeb(driveRes.body).pipe(res);
  } catch (error) {
    console.error('Stream error:', error);
    if (!res.headersSent) res.status(500).end();
  }
};

const downloadZip = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ message: 'No IDs provided' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="Moments_Backup.zip"');

    await mediaService.generateZipStream(ids, res);
  } catch (error) {
    console.error('Zip download error:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

module.exports = {
  getMedia,
  uploadMedia,
  updateMedia,
  bulkDelete,
  deleteMedia,
  streamMedia,
  downloadZip
};
