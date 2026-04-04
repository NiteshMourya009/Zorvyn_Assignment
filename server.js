import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

import { transactionRoutes } from './routes/transaction.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';
import { AppError } from './utils/appError.js';

// Load env variables
dotenv.config();

const app = express();

// 1) GLOBAL MIDDLEWARES

// Set security HTTP headers
app.use(helmet());

// Implement CORS
app.use(cors());
app.options('*', cors());

// Limit requests from same API (Security Phase 2)
const limiter = rateLimit({
  max: 100, // Allow 100 requests from same IP in 1 hour
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// 2) ROUTES
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/transactions', transactionRoutes);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

// 3) SERVER & DATABASE SETUP

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finance-dashboard';
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose
  .connect(DB_URI)
  .then(() => console.log('DB connection successful!'))
  .catch((err) => console.log('DB connection error:', err));

const server = app.listen(PORT, () => {
  console.log(`App running on port ${PORT}...`);
});

// Handle unhandled Promise rejections globally
process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err?.name, err?.message);
  server.close(() => {
    process.exit(1);
  });
});
