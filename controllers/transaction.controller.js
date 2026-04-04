import * as transactionService from '../services/transaction.service.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { transactionValidationSchema } from '../utils/validation.js';

export const createTransaction = catchAsync(async (req, res, next) => {
  // Input Validation
  const { error, value } = transactionValidationSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  // Link transaction to currently logged-in user
  value.user = req.user.id;

  // Enforce Admin creation based on assignment requirements
  if (req.user.role !== 'Admin') {
    return next(new AppError('Only Admins can create records', 403));
  }

  const transaction = await transactionService.createTransaction(value);

  res.status(201).json({
    status: 'success',
    data: { transaction },
  });
});

export const getTransactions = catchAsync(async (req, res, next) => {
  // If user is Viewer, they only see their own transactions. Admin/Analyst might see more.
  const baseQuery = req.user.role === 'Viewer' ? { user: req.user.id } : {};
  
  const transactions = await transactionService.getTransactions(baseQuery, req.query);

  res.status(200).json({
    status: 'success',
    results: transactions.length,
    data: { transactions },
  });
});

export const getDashboardAnalytics = catchAsync(async (req, res, next) => {
  // Call to the Service Layer which handles MongoDB Aggregations
  const analytics = await transactionService.getDashboardAnalytics();

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

  // Ensure Admin or Owner is deleting
  if (req.user.role !== 'Admin' && transaction.user.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to delete this transaction', 403));
  }

  // Calls the Service Layer implementation (which does soft-delete)
  await transactionService.deleteTransaction(req.params.id);

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

  // Ensure Admin
  if (req.user.role !== 'Admin') {
    return next(new AppError('Only Admins can update records', 403));
  }

  const updatedTx = await transactionService.updateTransaction(req.params.id, req.body);

  res.status(200).json({
    status: 'success',
    data: { transaction: updatedTx },
  });
});
