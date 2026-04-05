import { Transaction } from '../models/transaction.model.js';
import { APIFeatures } from '../utils/apiFeatures.js';

import mongoose from 'mongoose';

export const createTransaction = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [transaction] = await Transaction.create([data], { session });
    await session.commitTransaction();
    session.endSession();
    return transaction;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const getTransactions = async (baseQuery = {}, queryString = {}) => {
  const features = new APIFeatures(Transaction.find(baseQuery), queryString)
    .filter()
    .sort()
    .limitFields()
    .paginate()
    .cursor(); // Call cursor down here
  return await features.query;
};

export const getTransactionById = async (id) => {
  return await Transaction.findById(id);
};

export const updateTransaction = async (id, data) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const transaction = await Transaction.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
      session
    });
    await session.commitTransaction();
    session.endSession();
    return transaction;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const deleteTransaction = async (id) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const transaction = await Transaction.findByIdAndUpdate(id, { isDeleted: true }, { new: true, session });
    await session.commitTransaction();
    session.endSession();
    return transaction;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// Advanced Analytics Service utilizing MongoDB Aggregation Pipelines
export const getDashboardAnalytics = async () => {
  // 1) Overview: totalIncome, totalExpense, netBalance
  const stats = await Transaction.aggregate([
    {
      // We only consider active transactions (not soft deleted)
      // Mongoose pre find hooks don't apply to aggregations, so we explicitly filter
      $match: { isDeleted: { $ne: true } }
    },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0],
          },
        },
        totalExpense: {
          $sum: {
            $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalIncome: 1,
        totalExpense: 1,
        netBalance: { $subtract: ['$totalIncome', '$totalExpense'] },
      },
    },
  ]);

  // 2) Category-wise breakdown
  const categoryBreakdown = await Transaction.aggregate([
    {
      $match: { isDeleted: { $ne: true } }
    },
    {
      $group: {
        _id: { category: '$category', type: '$type' },
        totalAmount: { $sum: '$amount' }
      }
    },
    {
      $project: {
        _id: 0,
        category: '$_id.category',
        type: '$_id.type',
        totalAmount: 1
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);

  // 3) Recent Activity: last 5 transactions with user details
  const recentActivity = await Transaction.aggregate([
    {
      $match: { isDeleted: { $ne: true } }
    },
    { $sort: { createdAt: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    {
      $project: {
        amount: 1,
        type: 1,
        category: 1,
        notes: 1,
        date: 1,
        createdAt: 1,
        createdBy: { $arrayElemAt: ['$userInfo.name', 0] }
      }
    }
  ]);

  // 4) Monthly Trends: income vs expense grouped by year-month
  const monthlyTrends = await Transaction.aggregate([
    {
      $match: { isDeleted: { $ne: true } }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' }
        },
        totalIncome: {
          $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
        },
        totalExpense: {
          $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
        },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        totalIncome: 1,
        totalExpense: 1,
        netBalance: { $subtract: ['$totalIncome', '$totalExpense'] },
        count: 1
      }
    },
    { $sort: { year: 1, month: 1 } }
  ]);

  // Combine all results
  const overview = stats.length > 0 ? stats[0] : { totalIncome: 0, totalExpense: 0, netBalance: 0 };

  return {
    overview,
    categoryBreakdown,
    recentActivity,
    monthlyTrends,
  };
};
