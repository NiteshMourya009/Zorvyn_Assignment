import * as userService from '../services/user.service.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { userValidationSchema, updateUserSchema } from '../utils/validation.js';

export const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await userService.getAllActiveUsers();
  res.status(200).json({ status: 'success', results: users.length, data: { users } });
});

export const getUser = catchAsync(async (req, res, next) => {
  const user = await userService.getUserById(req.params.id);
  if (!user) return next(new AppError('No active user found with that ID', 404));
  res.status(200).json({ status: 'success', data: { user } });
});

export const createUser = catchAsync(async (req, res, next) => {
  const { error, value } = userValidationSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  const newUser = await userService.createUser(value);
  
  // ensure we don't send back password
  newUser.password = undefined;

  res.status(201).json({ status: 'success', data: { user: newUser } });
});

export const updateUser = catchAsync(async (req, res, next) => {
  if (req.body.password) {
    return next(new AppError('This route is not for password updates.', 400));
  }

  // Validate the update payload
  const { error, value } = updateUserSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  const updatedUser = await userService.updateUser(req.params.id, value);
  
  if (!updatedUser) {
    return next(new AppError('No active user found with that ID', 404));
  }

  res.status(200).json({ status: 'success', data: { user: updatedUser } });
});

export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await userService.deleteUser(req.params.id);
  
  if (!user) {
    return next(new AppError('No active user found with that ID', 404));
  }

  res.status(204).json({ status: 'success', data: null });
});

