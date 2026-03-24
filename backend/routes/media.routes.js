const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/media.controller');
const { authenticateToken, optionalAuthenticate } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.get('/', optionalAuthenticate, mediaController.getMedia);
router.post('/upload', authenticateToken, upload.array('files'), mediaController.uploadMedia);
router.put('/:id', authenticateToken, mediaController.updateMedia);
router.post('/bulk-delete', authenticateToken, mediaController.bulkDelete);
router.delete('/:id', authenticateToken, mediaController.deleteMedia);
router.get('/:id/stream', mediaController.streamMedia);
router.post('/download-zip', optionalAuthenticate, mediaController.downloadZip);

module.exports = router;
