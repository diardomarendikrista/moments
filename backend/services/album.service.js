const albumRepository = require('../repositories/album.repository');
const mediaRepository = require('../repositories/media.repository');
const driveService = require('./driveService');

const addFolder = async (albumName, year, category) => {
  return await albumRepository.upsertAlbumCategory(albumName, year, category);
};

const renameFolder = async (renameData) => {
  const { renameType, oldName, newName, albumName, year, category } = renameData;

  // Find target in drive
  const targetFolderId = await driveService.getFolderIdOnly(
    renameType === 'album' ? oldName : albumName,
    renameType === 'category' ? year : null,
    renameType === 'category' ? oldName : null
  );

  if (targetFolderId) {
    await driveService.renameFolder(targetFolderId, newName);
  }

  // Sync to DB
  if (renameType === 'album') {
    await mediaRepository.updateMediaAlbumName(oldName, newName);
    await albumRepository.updateAlbumName(oldName, newName);
  } else if (renameType === 'category') {
    await mediaRepository.updateMediaCategoryName(albumName, year, oldName, newName);
    await albumRepository.updateAlbumCategoryName(albumName, year, oldName, newName);
  }
  return { success: true };
};

const deleteFolder = async (deleteData) => {
  const { deleteType, albumName, year, category } = deleteData;

  const targetFolderId = await driveService.getFolderIdOnly(albumName, deleteType === 'category' ? year : null, deleteType === 'category' ? category : null);

  if (targetFolderId) {
    await driveService.deleteFile(targetFolderId); // Deletes recursively
  }

  if (deleteType === 'album') {
    await mediaRepository.deleteMediaByAlbum(albumName);
    await albumRepository.deleteAlbum(albumName);
  } else if (deleteType === 'category') {
    await mediaRepository.deleteMediaByCategory(albumName, year, category);
    await albumRepository.deleteAlbumCategory(albumName, year, category);
  }
  return { success: true };
};

module.exports = {
  addFolder,
  renameFolder,
  deleteFolder
};
