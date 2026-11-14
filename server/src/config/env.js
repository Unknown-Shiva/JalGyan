import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || (nodeEnv === 'production' ? null : 'jalgyan-default-secret-key-change-me');
if (!jwtSecret) {
  throw new Error('JWT_SECRET must be configured when NODE_ENV is production.');
}

export const config = {
  port: parseInt(process.env.PORT, 10) || 5001,
  nodeEnv,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@jalgyan.org',
  adminPassword: process.env.ADMIN_PASSWORD || 'AdminSecureWaterWise2026!',
};
