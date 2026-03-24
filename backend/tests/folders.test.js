const request = require('supertest');
const app = require('../app');
const db = require('../config/db.config');
const driveService = require('../services/driveService');
const jwt = require('jsonwebtoken');

jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

jest.mock('../config/db.config', () => ({
  initSchema: jest.fn(),
  query: jest.fn()
}));

jest.mock('../services/driveService', () => ({
  getTargetFolderId: jest.fn(),
  getFolderIdOnly: jest.fn(),
  renameFolder: jest.fn(),
  deleteFile: jest.fn(),
  oauth2Client: {
    getAccessToken: jest.fn(() => Promise.resolve({ token: 'mock-token' }))
  }
}));

jest.mock('jsonwebtoken');

describe('Folder & Bulk API', () => {
  const token = 'valid-token';
  const user = { id: '1', username: 'admin', role: 'admin' };

  beforeEach(() => {
    jest.resetAllMocks();
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, user);
    });
  });

  describe('POST /api/folders/add', () => {
    it('should add a folder successfully', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 1 });
      const res = await request(app)
        .post('/api/folders/add')
        .set('Authorization', `Bearer ${token}`)
        .send({ albumName: 'Wedding', year: '2023', category: 'Events' });

      expect(res.statusCode).toEqual(200);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO albums'), expect.any(Array));
    });
  });

  describe('PUT /api/folders/rename', () => {
    it('should rename an album', async () => {
      driveService.getFolderIdOnly.mockResolvedValueOnce('folder-id');
      db.query.mockResolvedValue({ rowCount: 1 });

      const res = await request(app)
        .put('/api/folders/rename')
        .set('Authorization', `Bearer ${token}`)
        .send({ renameType: 'album', oldName: 'Old', newName: 'New' });

      expect(res.statusCode).toEqual(200);
      expect(driveService.renameFolder).toHaveBeenCalledWith('folder-id', 'New');
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE media SET album_name = $1'), ['New', 'Old']);
    });
  });

  describe('POST /api/media/bulk-delete', () => {
    it('should perform bulk deletion', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 2, rows: [{ id: '1', drive_file_id: 'd1' }, { id: '2', drive_file_id: 'd2' }] });
      db.query.mockResolvedValueOnce({ rowCount: 2 }); // For the DELETE query

      const res = await request(app)
        .post('/api/media/bulk-delete')
        .set('Authorization', `Bearer ${token}`)
        .send({ ids: ['1', '2'] });

      expect(res.statusCode).toEqual(200);
      expect(driveService.deleteFile).toHaveBeenCalledTimes(2);
    });
  });
});
