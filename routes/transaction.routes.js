import express from 'express';
import * as transactionController from '../controllers/transaction.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { checkPermission } from '../middlewares/rbac.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(protect);

router
  .route('/')
  .post(
    checkPermission('transaction:create'),
    transactionController.createTransaction
  )
  .get(
    // No explicit route restriction needed; controller handles Viewer-scoping vs Admin/Analyst full read
    // But we can add a checkPermission('transaction:readAll') if we had separate endpoints. 
    // This assignment relies on the same endpoint serving both use cases.
    transactionController.getTransactions
  );

router
  .route('/analytics')
  .get(
    checkPermission('transaction:analytics'),
    transactionController.getDashboardAnalytics
  );

router
  .route('/:id')
  .get(
    // Controller enforces Viewer access to self only
    transactionController.getTransaction
  )
  .patch(
    checkPermission('transaction:update'),
    transactionController.updateTransaction
  )
  .delete(
    checkPermission('transaction:delete'),
    transactionController.deleteTransaction
  );

export { router as transactionRoutes };

