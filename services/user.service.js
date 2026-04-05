import { User } from '../models/user.model.js';
import mongoose from 'mongoose';

export const getAllActiveUsers = async () => {
  return await User.find({ active: { $ne: false } });
};

export const getUserById = async (id) => {
  return await User.findOne({ _id: id, active: { $ne: false } });
};

export const createUser = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [user] = await User.create([data], { session });
    await session.commitTransaction();
    session.endSession();
    return user;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const updateUser = async (id, data) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findOneAndUpdate(
      { _id: id, active: { $ne: false } },
      data,
      { new: true, runValidators: true, session }
    );
    await session.commitTransaction();
    session.endSession();
    return user;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const deleteUser = async (id) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findOneAndUpdate(
      { _id: id, active: { $ne: false } },
      { active: false },
      { new: true, session }
    );
    await session.commitTransaction();
    session.endSession();
    return user;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
