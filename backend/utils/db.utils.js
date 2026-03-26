const db = require('../config/db.config');

const initSchema = async () => {
  const queryText = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE TABLE IF NOT EXISTS "media" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "drive_file_id" VARCHAR(255) NOT NULL,
      "album_name" VARCHAR(255) NOT NULL,
      "year" INT NOT NULL,
      "category" VARCHAR(255) NOT NULL,
      "file_name" VARCHAR(255) NOT NULL,
      "mime_type" VARCHAR(100) NOT NULL,
      "thumbnail_link" TEXT,
      "web_view_link" TEXT,
      "download_link_hd" TEXT,
      "width" INT,
      "height" INT,
      "size_bytes" BIGINT,
      "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "width" INT;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "height" INT;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "size_bytes" BIGINT;

    CREATE TABLE IF NOT EXISTS "albums" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" VARCHAR(255) UNIQUE NOT NULL,
      "description" TEXT,
      "categories" JSONB DEFAULT '[]'::jsonb,
      "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "users" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "username" VARCHAR(255) UNIQUE NOT NULL,
      "password" VARCHAR(255) NOT NULL,
      "role" VARCHAR(50) NOT NULL DEFAULT 'viewer',
      "name" VARCHAR(255),
      "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);

    -- Migration: Populate albums table from media if empty
    INSERT INTO "albums" (name, categories)
    SELECT album_name, jsonb_agg(jsonb_build_object('year', year, 'category', category))
    FROM (SELECT DISTINCT album_name, year, category FROM media) sub
    WHERE NOT EXISTS (SELECT 1 FROM albums)
    GROUP BY album_name
    ON CONFLICT (name) DO NOTHING;

    -- Seed default users if they don't exist
    INSERT INTO "users" (username, password, role, name)
    VALUES 
      ('admin', 'admin123', 'admin', 'Admin'),
      ('editor', 'editor123', 'editor', 'Editor')
    ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name;
  `;
  try {
    await db.query(queryText);
    console.log('Database schema initialized');
  } catch (err) {
    console.error('Error initializing schema:', err);
  }
};

const getBackupData = async () => {
  const users = await db.query('SELECT username, password, role, name FROM users;');
  const albums = await db.query('SELECT name, description, categories FROM albums;');
  const media = await db.query('SELECT * FROM media;');

  return {
    timestamp: new Date().toISOString(),
    users: users.rows,
    albums: albums.rows,
    media: media.rows
  };
};

module.exports = {
  initSchema,
  getBackupData
};
