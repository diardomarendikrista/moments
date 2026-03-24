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
  uploadFile: jest.fn(),
  oauth2Client: {
    getAccessToken: jest.fn(() => Promise.resolve({ token: 'mock-token' }))
  }
}));

jest.mock('jsonwebtoken');

describe('Media API', () => {
  const token = 'valid-token';
  const user = { id: '1', username: 'admin', role: 'admin' };

  beforeEach(() => {
    jest.resetAllMocks();
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, user);
    });
  });

  describe('GET /api/media', () => {
    it('should return list of media', async () => {
      const mockMedia = [
        { id: '1', file_name: 'photo.jpg', album_name: 'Trip', year: 2024, category: 'Personal' }
      ];
      db.query.mockResolvedValueOnce({ rows: mockMedia });

      const res = await request(app).get('/api/media');

      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('file_name', 'photo.jpg');
    });

    it('should filter by album', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });
      await request(app).get('/api/media?album=Trip');
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE album_name = $1'), ['Trip']);
    });
  });

  describe('GET /api/albums', () => {
    it('should return album names', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ name: 'Trip' }, { name: 'Work' }] });
      const res = await request(app).get('/api/albums');
      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toEqual(['Trip', 'Work']);
    });
  });

  describe('POST /api/media/upload', () => {
    it('should return 401 if not authenticated', async () => {
      jwt.verify.mockImplementationOnce((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      const res = await request(app)
        .post('/api/media/upload')
        .send({});

      expect(res.statusCode).toEqual(401);
    });

    // Note: Testing file upload with multer mocks can be complex.
    // For now, let's test the error case for no files.
    it('should return 400 if no files uploaded', async () => {
      const res = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${token}`)
        .send({ album_name: 'Test', year: '2024', category: 'General' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('No files uploaded.');
    });
  });
});
