import request from 'supertest';
import { app } from '../server.js';
import { User } from '../models/user.model.js';
import { jest } from '@jest/globals';

describe('User Endpoints', () => {
  let adminToken, viewerToken;
  let viewerUserId;

  beforeEach(async () => {
    // Note: In our current setup, signup assigns 'Viewer'
    // To create an admin, we bypass standard signup and create directly
    const adminUser = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'Admin'
    });

    const viewerUser = await User.create({
      name: 'Viewer',
      email: 'viewer@example.com',
      password: 'password123',
      role: 'Viewer'
    });
    viewerUserId = viewerUser._id;

    // Login Admin
    const resAdmin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });
    adminToken = resAdmin.body.accessToken;

    // Login Viewer
    const resViewer = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'viewer@example.com', password: 'password123' });
    viewerToken = resViewer.body.accessToken;
  });

  describe('GET /api/v1/users', () => {
    it('should return all users for Admin', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.users.length).toBeGreaterThanOrEqual(2);
    });

    it('should deny access for Viewer', async () => {
      await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should soft delete user by Admin', async () => {
      await request(app)
        .delete(`/api/v1/users/${viewerUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify soft delete
      const user = await User.findById(viewerUserId).select('+active');
      expect(user.active).toBe(false);

      // Test that getAllUsers does not return inactive user
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const activeUserIds = res.body.data.users.map(u => u._id);
      expect(activeUserIds.includes(viewerUserId.toString())).toBe(false);
    });
  });
});
