const db = require('../config/db.config');

const createmedia = async (mediaData) => {
  const query = `
    INSERT INTO media (drive_file_id, album_name, year, category, file_name, mime_type, thumbnail_link, web_view_link, download_link_hd, width, height, size_bytes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `;
  const values = [
    mediaData.drive_file_id,
    mediaData.album_name,
    mediaData.year,
    mediaData.category,
    mediaData.file_name,
    mediaData.mime_type,
    mediaData.thumbnail_link,
    mediaData.web_view_link,
    mediaData.download_link_hd,
    mediaData.width,
    mediaData.height,
    mediaData.size_bytes
  ];
  const res = await db.query(query, values);
  return res.rows[0];
};

const getMedia = async (filters = {}) => {
  let query = 'SELECT * FROM media';
  let params = [];
  let conditions = [];

  if (filters.album) { params.push(filters.album); conditions.push(`album_name = $${params.length}`); }
  if (filters.year) { params.push(filters.year); conditions.push(`year = $${params.length}`); }
  if (filters.category) { params.push(filters.category); conditions.push(`category = $${params.length}`); }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';
  const res = await db.query(query, params);
  return res.rows;
};

const getMediaById = async (id) => {
  const res = await db.query('SELECT * FROM media WHERE id = $1', [id]);
  return res.rows[0];
};

const getMediaByIds = async (ids) => {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  const query = `SELECT * FROM media WHERE id IN (${placeholders})`;
  const res = await db.query(query, ids);
  return res.rows;
};

const updateMedia = async (id, updateData) => {
  const query = `
    UPDATE media 
    SET album_name = $1, year = $2, category = $3
    WHERE id = $4
    RETURNING *;
  `;
  const values = [updateData.album_name, updateData.year, updateData.category, id];
  const res = await db.query(query, values);
  return res.rows[0];
};

const updateMediaAlbumName = async (oldName, newName) => {
  return await db.query('UPDATE media SET album_name = $1 WHERE album_name = $2', [newName, oldName]);
};

const updateMediaCategoryName = async (albumName, year, oldCategory, newCategory) => {
  return await db.query(
    'UPDATE media SET category = $1 WHERE album_name = $2 AND year = $3 AND category = $4',
    [newCategory, albumName, year, oldCategory]
  );
};

const deleteMedia = async (id) => {
  return await db.query('DELETE FROM media WHERE id = $1', [id]);
};

const deleteMediaByIds = async (ids) => {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  return await db.query(`DELETE FROM media WHERE id IN (${placeholders})`, ids);
};

const deleteMediaByAlbum = async (albumName) => {
  return await db.query('DELETE FROM media WHERE album_name = $1', [albumName]);
};

const deleteMediaByCategory = async (albumName, year, category) => {
  return await db.query(
    'DELETE FROM media WHERE album_name = $1 AND year = $2 AND category = $3',
    [albumName, year, category]
  );
};

module.exports = {
  createmedia,
  getMedia,
  getMediaById,
  getMediaByIds,
  updateMedia,
  updateMediaAlbumName,
  updateMediaCategoryName,
  deleteMedia,
  deleteMediaByIds,
  deleteMediaByAlbum,
  deleteMediaByCategory
};
