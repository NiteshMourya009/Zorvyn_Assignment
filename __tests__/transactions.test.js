import request from 'supertest';
import { app } from '../server.js';
import { User } from '../models/user.model.js';
import { Transaction } from '../models/transaction.model.js';
import { jest } from '@jest/globals';

describe('Transaction Endpoints', () => {
  let adminToken, viewerToken;
  let adminId, viewerId;

  beforeEach(async () => {
    const adminUser = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'Admin'
    });
    adminId = adminUser._id;

    const viewerUser = await User.create({
      name: 'Viewer',
      email: 'viewer@example.com',
      password: 'password123',
      role: 'Viewer'
    });
    viewerId = viewerUser._id;

    const resAdmin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });
    adminToken = resAdmin.body.accessToken;

    const resViewer = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'viewer@example.com', password: 'password123' });
    viewerToken = resViewer.body.accessToken;
  });

  const sampleTx = {
    amount: 100,
    type: 'income',
    category: 'salary',
  };

  describe('POST /api/v1/transactions', () => {
    it('should create transaction for Admin', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleTx)
        .expect(201);

      expect(res.body.data.transaction.amount).toBe(100);
    });

    it('should deny create for Viewer', async () => {
      await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(sampleTx)
        .expect(403);
    });
  });

  describe('GET /api/v1/transactions', () => {
    beforeEach(async () => {
      await Transaction.create({ ...sampleTx, user: adminId });
      await Transaction.create({ ...sampleTx, amount: 200, user: viewerId });
    });

    it('Admin should see all transactions', async () => {
      const res = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.results).toBe(2);
    });

    it('Viewer should see only their own transactions', async () => {
      const res = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body.results).toBe(1);
      expect(res.body.data.transactions[0].user).toBe(viewerId.toString());
    });
    
    it('should use cursor pagination logic when limit is set', async () => {
      await Transaction.create({ ...sampleTx, amount: 300, user: adminId });
      
      const res = await request(app)
        .get('/api/v1/transactions?limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(res.body.results).toBe(2);
      expect(res.body.nextCursor).toBeDefined();
    });
  });

  describe('Analytics', () => {
     it('should return analytics for Admin', async () => {
        await Transaction.create({ ...sampleTx, amount: 500, type: 'income', user: adminId });
        
        const res = await request(app)
          .get('/api/v1/transactions/analytics')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
          
        expect(res.body.data.analytics).toBeDefined();
     });
     
     it('should deny viewers from analytics', async () => {
        await request(app)
          .get('/api/v1/transactions/analytics')
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(403);
     });
  });
});
