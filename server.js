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
import { connectRedis } from './utils/redisClient.js';


dotenv.config();

const app = express();



// Set security HTTP headers
app.use(helmet());

// Implement CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new AppError('Not allowed by CORS', 403));
    }
  },
  credentials: true
}));
app.options('*', cors());

// Limit requests from same API (Security Phase 2)
const limiter = rateLimit({
  max: 100, // Allow 100 requests from same IP in 1 hour
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);


app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());


app.use(mongoSanitize());

// 2) ROUTES
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the Finance API! Use /api/v1/auth/signup to register.',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'live' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/transactions', transactionRoutes);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);


const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finance-dashboard';
const PORT = process.env.PORT || 3000;

// Connect to MongoDB & Redis
if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(DB_URI)
    .then(() => {
      console.log('DB connection successful!');
      connectRedis(); // Init Redis after Mongo connects loosely
    })
    .catch((err) => console.log('DB connection error:', err));

  const server = app.listen(PORT, () => {
    console.log(`App running on port ${PORT}...`);
  });

  // Handle unhandled Promise rejections globally
  process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! Shutting down...');
    console.log(err?.name, err?.message);
    server.close(() => {
      process.exit(1);
    });
  });
}

export { app };

