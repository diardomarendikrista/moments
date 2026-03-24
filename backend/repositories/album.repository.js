const db = require('../config/db.config');

const getAllAlbums = async () => {
  const res = await db.query('SELECT name FROM albums ORDER BY name ASC;');
  return res.rows.map(r => r.name);
};

const getAllAlbumsWithCategories = async () => {
  const res = await db.query('SELECT name, categories FROM albums ORDER BY name ASC;');
  return res.rows;
};

const getAlbumByName = async (name) => {
  const res = await db.query('SELECT * FROM albums WHERE name = $1', [name]);
  return res.rows[0];
};

const upsertAlbumCategory = async (albumName, year, category) => {
  const query = `
    INSERT INTO albums (name, categories)
    VALUES ($1, jsonb_build_array(jsonb_build_object('year', $2::int, 'category', $3::text)))
    ON CONFLICT (name) DO UPDATE 
    SET categories = COALESCE((
      SELECT jsonb_agg(distinct_elems)
      FROM (
        SELECT DISTINCT jsonb_array_elements(albums.categories || jsonb_build_array(jsonb_build_object('year', $2::int, 'category', $3::text))) as distinct_elems
      ) sub
    ), '[]'::jsonb);
  `;
  return await db.query(query, [albumName, parseInt(year), category]);
};

const updateAlbumName = async (oldName, newName) => {
  return await db.query('UPDATE albums SET name = $1 WHERE name = $2', [newName, oldName]);
};

const updateAlbumCategoryName = async (albumName, year, oldCategory, newCategory) => {
  const query = `
    UPDATE albums 
    SET categories = COALESCE((
      SELECT jsonb_agg(
        CASE 
          WHEN (elem->>'year')::int = $3::int AND elem->>'category' = $4::text
          THEN jsonb_build_object('year', $3::int, 'category', $1::text) 
          ELSE elem 
        END
      )
      FROM jsonb_array_elements(categories) elem
    ), '[]'::jsonb)
    WHERE name = $2;
  `;
  return await db.query(query, [newCategory, albumName, parseInt(year), oldCategory]);
};

const deleteAlbum = async (name) => {
  return await db.query('DELETE FROM albums WHERE name = $1', [name]);
};

const deleteAlbumCategory = async (albumName, year, category) => {
  const query = `
    UPDATE albums 
    SET categories = COALESCE((
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements(categories) elem
      WHERE (elem->>'year')::int != $2::int OR elem->>'category' != $3::text
    ), '[]'::jsonb)
    WHERE name = $1;
  `;
  return await db.query(query, [albumName, parseInt(year), category]);
};

module.exports = {
  getAllAlbums,
  getAllAlbumsWithCategories,
  getAlbumByName,
  upsertAlbumCategory,
  updateAlbumName,
  updateAlbumCategoryName,
  deleteAlbum,
  deleteAlbumCategory
};
