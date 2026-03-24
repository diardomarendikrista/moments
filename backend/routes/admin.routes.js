const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.get('/db/export', authenticateToken, adminController.exportDb);
router.post('/db/import', authenticateToken, upload.single('file'), adminController.importDb);

module.exports = router;
