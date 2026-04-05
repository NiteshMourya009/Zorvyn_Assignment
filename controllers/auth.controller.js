import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { RefreshToken, generateRefreshToken } from '../models/refreshToken.model.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { userValidationSchema } from '../utils/validation.js';

const signAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '15m', // Short-lived access token
  });
};

const createSendTokens = async (user, statusCode, res) => {
  const accessToken = signAccessToken(user._id);
  const refreshTokenString = generateRefreshToken();

  // Save refresh token to DB (7 days TTL)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    token: refreshTokenString,
    user: user._id,
    expiresAt,
  });

  // Access token cookie (optional, primarily we'll use Bearer header for access token now)
  const accessCookieOptions = {
    expires: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    httpOnly: true,
  };

  // Refresh token cookie (strict HTTP only)
  const refreshCookieOptions = {
    expires: expiresAt,
    httpOnly: true,
    path: '/api/v1/auth/refresh', // Restrict where it's sent
  };

  if (process.env.NODE_ENV === 'production') {
    accessCookieOptions.secure = true;
    refreshCookieOptions.secure = true;
  }

  res.cookie('jwt', accessToken, accessCookieOptions);
  res.cookie('refreshToken', refreshTokenString, refreshCookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    accessToken,
    data: {
      user,
    },
  });
};

export const signup = catchAsync(async (req, res, next) => {
  const { error, value } = userValidationSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  const existingUser = await User.findOne({ email: value.email });
  if (existingUser) {
    return next(new AppError('Email is already registered. Please login instead.', 400));
  }

  const newUser = await User.create({
    name: value.name,
    email: value.email,
    password: value.password,
    role: value.role,
  });

  await createSendTokens(newUser, 201, res);
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  
  if (user.active === false) {
     return next(new AppError('This account has been deactivated.', 403));
  }

  await createSendTokens(user, 200, res);
});

export const refresh = catchAsync(async (req, res, next) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    return next(new AppError('No refresh token provided', 401));
  }

  const storedToken = await RefreshToken.findOne({ token: incomingRefreshToken })
    .populate('user');

  if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
    return next(new AppError('Invalid or expired refresh token. Please login again.', 401));
  }

  const user = storedToken.user;
  if (!user || user.active === false) {
    return next(new AppError('User not found or deactivated', 401));
  }

  // Revoke the old token (rotation)
  storedToken.isRevoked = true;
  await storedToken.save();

  // Issue new tokens
  await createSendTokens(user, 200, res);
});

export const logout = catchAsync(async (req, res, next) => {
  // Try to revoke refresh token if provided
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (incomingRefreshToken) {
     await RefreshToken.findOneAndUpdate(
       { token: incomingRefreshToken },
       { isRevoked: true }
     );
  }

  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  
  res.cookie('refreshToken', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    path: '/api/v1/auth/refresh',
  });
  
  res.status(200).json({ status: 'success' });
});

