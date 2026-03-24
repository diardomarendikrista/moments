const request = require('supertest');
const app = require('../app');

jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

// Mock external services to avoid real connections during server import
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

describe('Health Check API', () => {
  it('should return 200 OK for /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'OK');
  });

  it('should return 200 OK for /api', async () => {
    const res = await request(app).get('/api');
    expect(res.statusCode).toEqual(200);
  });
});
