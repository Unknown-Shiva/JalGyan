import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// CORS configuration
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount all API routes under /api
app.use('/api', apiRoutes);

// Catch-all 404 for undefined routes
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

export default app;
