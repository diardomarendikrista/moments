const express = require('express');
const cors = require('cors');
require('dotenv').config();

const dbUtils = require('./utils/db.utils');
const { initCron } = require('./utils/cron.utils');

const authRoutes = require('./routes/auth.routes');
const mediaRoutes = require('./routes/media.routes');
const albumRoutes = require('./routes/album.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize schema on startup
dbUtils.initSchema();

// Initialize Cron Jobs
initCron();

// Health Check
app.get(['/', '/api', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Moments API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api', albumRoutes); // Fallback for /api/folders/...
app.use('/api/admin', adminRoutes);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
