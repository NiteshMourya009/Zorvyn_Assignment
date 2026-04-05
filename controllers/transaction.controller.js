import * as transactionService from '../services/transaction.service.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { transactionValidationSchema } from '../utils/validation.js';
import { cacheGet, cacheSet, cacheInvalidate } from '../utils/cache.js';

export const createTransaction = catchAsync(async (req, res, next) => {
  const { error, value } = transactionValidationSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  value.user = req.user.id;

  const transaction = await transactionService.createTransaction(value);

  // Invalidate global analytics cache
  await cacheInvalidate('analytics:global');

  res.status(201).json({
    status: 'success',
    data: { transaction },
  });
});

export const getTransactions = catchAsync(async (req, res, next) => {
  const baseQuery = req.user.role === 'Viewer' ? { user: req.user.id } : {};
  
  const transactions = await transactionService.getTransactions(baseQuery, req.query);

  // Generate cursor metadata if we are using cursor pagination logic
  let nextCursor = null;
  if (transactions.length > 0 && (req.query.cursor || (!req.query.page && !req.query.limit))) {
     const lastItem = transactions[transactions.length - 1];
     nextCursor = Buffer.from(JSON.stringify({ _id: lastItem._id })).toString('base64');
  }

  res.status(200).json({
    status: 'success',
    results: transactions.length,
    nextCursor,
    data: { transactions },
  });
});

export const getTransaction = catchAsync(async (req, res, next) => {
  const transaction = await transactionService.getTransactionById(req.params.id);

  if (!transaction) {
    return next(new AppError('No transaction found with that ID', 404));
  }

  // Viewers can only see their own transactions
  if (req.user.role === 'Viewer' && transaction.user.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to view this transaction', 403));
  }

  res.status(200).json({
    status: 'success',
    data: { transaction },
  });
});

export const getDashboardAnalytics = catchAsync(async (req, res, next) => {
  const cacheKey = 'analytics:global';
  
  // 1) Try hit cache
  const cachedData = await cacheGet(cacheKey);
  if (cachedData) {
    return res.status(200).json({
      status: 'success',
      data: { analytics: cachedData },
    });
  }

  // 2) Cache miss, calculate
  const analytics = await transactionService.getDashboardAnalytics();

  // 3) Set cache (TTL: 5 minutes = 300s)
  await cacheSet(cacheKey, analytics, 300);

  res.status(200).json({
    status: 'success',
    data: { analytics },
  });
});

export const deleteTransaction = catchAsync(async (req, res, next) => {
  const transaction = await transactionService.getTransactionById(req.params.id);

  if (!transaction) {
    return next(new AppError('No transaction found with that ID', 404));
  }

  // We rely on route-level RBAC for Admin-only access here
  await transactionService.deleteTransaction(req.params.id);

  await cacheInvalidate('analytics:global');

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

export const updateTransaction = catchAsync(async (req, res, next) => {
  const transaction = await transactionService.getTransactionById(req.params.id);

  if (!transaction) {
    return next(new AppError('No transaction found with that ID', 404));
  }

  const updatedTx = await transactionService.updateTransaction(req.params.id, req.body);

  await cacheInvalidate('analytics:global');

  res.status(200).json({
    status: 'success',
    data: { transaction: updatedTx },
  });
});

