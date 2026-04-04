import express from 'express';
import * as transactionController from '../controllers/transaction.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(protect);

router
  .route('/')
  .post(
    // Access control: Only Admin can create
    restrictTo('Admin'),
    transactionController.createTransaction
  )
  .get(
    // Everyone can view (controller limits Viewers to their own records)
    transactionController.getTransactions
  );

router
  .route('/analytics')
  .get(
    // RBAC: Only Admin and Analyst can view global analytics
    restrictTo('Admin', 'Analyst'),
    transactionController.getDashboardAnalytics
  );

router
  .route('/:id')
  .patch(
    restrictTo('Admin'),
    transactionController.updateTransaction
  )
  .delete(
    restrictTo('Admin'),
    transactionController.deleteTransaction
  );

export { router as transactionRoutes };
