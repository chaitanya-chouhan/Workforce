import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import healthRouter from './routes/health';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import workersRouter from './routes/workers';
import requestsRouter from './routes/requests';
import otpRouter from './routes/otp';
import tasksRouter from './routes/tasks';
import feedbackRouter from './routes/feedback';
import notificationsRouter from './routes/notifications';
import adminRouter from './routes/admin';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: [FRONTEND_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logging
app.use(morgan('dev'));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', generalLimiter);

// Specific stricter rate limiter for OTP operations
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 attempts per 5 minutes
  message: { success: false, error: 'Too many OTP attempts. Please wait 5 minutes before trying again.' },
});
app.use('/api/requests/:id/assignment-otp', otpLimiter);
app.use('/api/requests/:id/verify-assignment-otp', otpLimiter);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root info
app.get('/', (_req, res) => {
  res.json({
    name: 'WorkForce API',
    description: 'AI-Powered Local Service Platform Backend (Firebase & Gemma 4)',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Mount Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/workers', workersRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/requests', otpRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);

// Centralized Error Handler
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`  WorkForce Backend Server Running!      `);
    console.log(`  Port: ${PORT}                          `);
    console.log(`  Frontend: ${FRONTEND_ORIGIN}           `);
    console.log(`  Health Check: http://localhost:${PORT}/api/health `);
    console.log(`=========================================`);
  });
}

export default app;
