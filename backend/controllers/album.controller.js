const albumRepository = require('../repositories/album.repository');
const albumService = require('../services/album.service');

const getAlbums = async (req, res) => {
  try {
    const data = await albumRepository.getAllAlbums();
    res.status(200).json({ data });
  } catch (error) {
    console.error('Fetch albums error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

const getAllAlbumsWithCategories = async (req, res) => {
  try {
    const data = await albumRepository.getAllAlbumsWithCategories();
    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const { album_name } = req.params;
    const album = await albumRepository.getAlbumByName(album_name);

    if (!album) {
      return res.status(200).json({ data: [] });
    }

    let categories = album.categories || [];
    categories.sort((a, b) => b.year - a.year || a.category.localeCompare(b.category));

    res.status(200).json({ data: categories });
  } catch (error) {
    console.error('Fetch categories error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

const addFolder = async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'editor') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { albumName, year, category } = req.body;
  if (!albumName || !year || !category) {
    return res.status(400).json({ message: 'Album, Year, and Category are required' });
  }

  try {
    await albumService.addFolder(albumName, year, category);
    res.status(200).json({ message: 'Folder added successfully' });
  } catch (error) {
    console.error('Add folder error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

const renameFolder = async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'editor') {
    return res.status(403).json({ message: 'Access denied' });
  }
  try {
    await albumService.renameFolder(req.body);
    res.status(200).json({ message: 'Folder renamed successfully' });
  } catch (err) {
    console.error('Rename folder error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
};

const deleteFolder = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin only' });
  }
  try {
    await albumService.deleteFolder(req.body);
    res.status(200).json({ message: 'Folder and contents permanently deleted' });
  } catch (err) {
    console.error('Delete folder error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
};

module.exports = {
  getAlbums,
  getAllAlbumsWithCategories,
  getCategories,
  addFolder,
  renameFolder,
  deleteFolder
};
