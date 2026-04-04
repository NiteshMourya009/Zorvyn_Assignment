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
    .paginate();
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
        // Group by categories and aggregate their totals by pushing into an array
        categories: {
          $push: {
            category: '$category',
            amount: '$amount',
            type: '$type',
          }
        }
      },
    },
    {
      $project: {
        _id: 0,
        totalIncome: 1,
        totalExpense: 1,
        netBalance: { $subtract: ['$totalIncome', '$totalExpense'] },
        categories: 1
      },
    },
  ]);

  // Aggregate category-wise breakdown using another pipeline branch or processing memory
  // A second pipeline specifically for category distribution:
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
    }
  ]);

  // Combine results
  const overview = stats.length > 0 ? stats[0] : { totalIncome: 0, totalExpense: 0, netBalance: 0 };
  delete overview.categories; // Cleanup detailed pushes if you just want totals

  return {
    overview,
    categoryBreakdown
  };
};
