import express from 'express';
import './types';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load env variables
dotenv.config();

// Startup validation check for environment variables
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'CORS_ORIGIN'
];

for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    console.error(`Error: Missing ${envVar} in .env`);
    process.exit(1);
  }
}

const rzpKeyId = process.env.RAZORPAY_KEY_ID || '';
if (!rzpKeyId.startsWith('rzp_test_')) {
  console.error('Error: Invalid RAZORPAY_KEY_ID in .env. It must start with "rzp_test_".');
  process.exit(1);
}

import authRoutes from './routes/auth.routes';
import productsRoutes from './routes/products.routes';
import ordersRoutes from './routes/orders.routes';
import subscriptionsRoutes from './routes/subscriptions.routes';
import paymentsRoutes from './routes/payments.routes';
import adminRoutes from './routes/admin.routes';
import newsletterRoutes from './routes/newsletter.routes';
import wishlistRoutes from './routes/wishlist.routes';
import { errorHandler } from './middleware/errorHandler';
import { authRateLimiter, publicRateLimiter, userRateLimiter } from './middleware/rateLimiters';

const app = express();

// Security headers
app.use(helmet());

// CORS config
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CORS_ORIGIN || '']
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parser capturing raw body for signature verification (webhook)
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Route mountings with security rate limiters applied by route classification
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/products', publicRateLimiter, productsRoutes);
app.use('/api/orders', userRateLimiter, ordersRoutes);
app.use('/api/subscriptions', userRateLimiter, subscriptionsRoutes);
app.use('/api/payments', userRateLimiter, paymentsRoutes);
app.use('/api/admin', userRateLimiter, adminRoutes);
app.use('/api/newsletter', publicRateLimiter, newsletterRoutes);
app.use('/api/wishlist', userRateLimiter, wishlistRoutes);

// Base route checker
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Global error handler
app.use(errorHandler);

export default app;
