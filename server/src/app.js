import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import businessRoutes from './routes/businessRoutes.js';
import { categoryRoutes, dealRoutes, reviewRoutes, leadRoutes } from './routes/miscRoutes.js';
import { handleUploadError } from './middleware/upload.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { HttpError } from './utils/httpError.js';

const app = express();
app.set('trust proxy', 1); // Render/Railway sit behind a proxy

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) =>
      !origin || env.clientUrls.includes(origin) ? cb(null, true) : cb(new HttpError(403, 'Origin not allowed')),
  })
);
app.use(express.json({ limit: '100kb' }));

const limiter = (limit, windowMs = 15 * 60 * 1000) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, data: null, error: 'Too many requests. Please try again later.' } });

app.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' }, error: null }));

app.use('/api', limiter(400));
app.use('/api/auth', limiter(30)); // stricter for login/register
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/leads', leadRoutes);

app.use(notFound);
app.use(handleUploadError);
app.use(errorHandler);

export default app;
