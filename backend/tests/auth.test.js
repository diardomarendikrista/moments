const request = require('supertest');
const app = require('../app');
const db = require('../config/db.config');

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

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return 200 and token on successful login', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        password: 'password123',
        role: 'admin',
        name: 'Test Administrator'
      };

      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('username', 'testuser');
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM users'), ['testuser']);
    });

    it('should return 401 on invalid password', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        password: 'correct-password',
        role: 'admin'
      };

      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'wrong-password' });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid username or password');
    });

    it('should return 401 if user not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'any' });

      expect(res.statusCode).toEqual(401);
    });
  });
});
