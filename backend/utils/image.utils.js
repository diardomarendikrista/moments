const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Compresses an image using sharp.
 * - Resizes to max 4096px if larger (keeping aspect ratio).
 * - Converts/Stays as JPEG with optimized quality.
 * - Strips EXIF metadata.
 * 
 * @param {string} inputPath - Path to the original file.
 * @param {string} mimeType - Mimetype of the file.
 * @returns {Promise<string>} - Path to the compressed file.
 */
const compressImage = async (inputPath, mimeType) => {
  // Only process images
  if (!mimeType || !mimeType.startsWith('image/')) {
    return inputPath;
  }

  const outputPath = `${inputPath}-compressed.jpg`;

  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    const MAX_DIMENSION = 4096;
    let resizeOptions = {};

    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      if (metadata.width > metadata.height) {
        resizeOptions = { width: MAX_DIMENSION };
      } else {
        resizeOptions = { height: MAX_DIMENSION };
      }
    }

    await image
      .rotate() // Auto-rotate based on EXIF orientation
      .resize({
        ...resizeOptions,
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({
        quality: 85,
        progressive: true,
        mozjpeg: true // Use mozjpeg for better compression
      })
      .toFile(outputPath);

    // Check if compressed file is actually smaller
    const originalSize = fs.statSync(inputPath).size;
    const compressedSize = fs.statSync(outputPath).size;

    console.log(`[Compression] File: ${path.basename(inputPath)}`);
    console.log(`[Compression] Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[Compression] Compressed: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[Compression] Dimensions: ${metadata.width}x${metadata.height}`);

    if (compressedSize < originalSize) {
      console.log(`[Compression] Result: Kept compressed version.`);
      // Compressed is smaller, swap files
      fs.unlinkSync(inputPath);
      fs.renameSync(outputPath, inputPath);
      return inputPath;
    } else {
      console.log(`[Compression] Result: Kept original (compressed was larger).`);
      // Original was better, cleanup compressed
      fs.unlinkSync(outputPath);
      return inputPath;
    }
  } catch (error) {
    console.error('Sharp compression error:', error);
    // If compression fails, return original path as fallback
    return inputPath;
  }
};

module.exports = {
  compressImage
};
