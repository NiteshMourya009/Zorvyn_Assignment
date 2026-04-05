import request from 'supertest';
import { app } from '../server.js';
import { User } from '../models/user.model.js';
import { RefreshToken } from '../models/refreshToken.model.js';
import { jest } from '@jest/globals';

describe('Auth Endpoints', () => {
  const testUser = {
    name: 'Test User',
    email: 'testauth@example.com',
    password: 'password123',
  };

  describe('POST /api/v1/auth/signup', () => {
    it('should create a new user and return tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send(testUser)
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
      
      const dbUser = await User.findOne({ email: testUser.email });
      expect(dbUser).toBeTruthy();
      expect(dbUser.role).toBe('Viewer'); // Default role
    });

    it('should not allow duplicate emails', async () => {
      await User.create(testUser); // Create first

      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send(testUser)
        .expect(400);

      expect(res.body.message).toMatch(/already registered/i);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await User.create({ ...testUser, role: 'Viewer' });
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.accessToken).toBeDefined();
      
      // Should set refresh token cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies.some(c => c.includes('refreshToken='))).toBeTruthy();
    });

    it('should reject incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(res.body.message).toMatch(/incorrect email or password/i);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let mockRefreshToken;
    let userId;

    beforeEach(async () => {
      const user = await User.create({ ...testUser, role: 'Viewer' });
      userId = user._id;

      // Mock login to get a refresh token
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const cookies = res.headers['set-cookie'];
      const refreshTokenCookie = cookies.find(c => c.startsWith('refreshToken='));
      mockRefreshToken = refreshTokenCookie.split(';')[0].split('=')[1];
    });

    it('should issue a new access token and refresh token when given valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${mockRefreshToken}`])
        .expect(200);

      expect(res.body.accessToken).toBeDefined();

      // Check that the old token was revoked in DB
      const oldTokenDoc = await RefreshToken.findOne({ token: mockRefreshToken });
      expect(oldTokenDoc.isRevoked).toBe(true);
    });

    it('should reject if refresh token is invalid', async () => {
      await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=fakeTokenHere`])
        .expect(401);
    });
  });
});
