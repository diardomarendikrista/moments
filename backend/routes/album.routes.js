const express = require('express');
const router = express.Router();
const albumController = require('../controllers/album.controller');
const { authenticateToken, optionalAuthenticate } = require('../middlewares/auth.middleware');

router.get('/', optionalAuthenticate, albumController.getAlbums);
router.get('/all', optionalAuthenticate, albumController.getAllAlbumsWithCategories);
router.get('/:album_name/categories', optionalAuthenticate, albumController.getCategories);

// Folder CRUD
router.post('/folders/add', authenticateToken, albumController.addFolder);
router.put('/folders/rename', authenticateToken, albumController.renameFolder);
router.delete('/folders/delete', authenticateToken, albumController.deleteFolder);

module.exports = router;
