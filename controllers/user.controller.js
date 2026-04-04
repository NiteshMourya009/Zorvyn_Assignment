import { User } from '../models/user.model.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import mongoose from 'mongoose';

export const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find({ active: { $ne: false } }); // Only active users by default
  res.status(200).json({ status: 'success', results: users.length, data: { users } });
});

export const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('No user found with that ID', 404));
  res.status(200).json({ status: 'success', data: { user } });
});

export const createUser = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [newUser] = await User.create([req.body], { session });
    await session.commitTransaction();
    session.endSession();
    
    // remove pass from response
    newUser.password = undefined;

    res.status(201).json({ status: 'success', data: { user: newUser } });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

export const updateUser = catchAsync(async (req, res, next) => {
  if (req.body.password) {
    return next(new AppError('This route is not for password updates.', 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
      session
    });
    
    if (!updatedUser) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('No user found with that ID', 404));
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ status: 'success', data: { user: updatedUser } });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

export const deleteUser = catchAsync(async (req, res, next) => {
  // Soft Delete User (ACID transaction)
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { active: false }, { session });
    
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('No user found with that ID', 404));
    }

    await session.commitTransaction();
    session.endSession();

    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});
