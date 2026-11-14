import { config } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  const errorStatus = Number(err?.statusCode ?? err?.status);
  const statusCode = Number.isInteger(errorStatus) && errorStatus >= 400 && errorStatus <= 599
    ? errorStatus
    : res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const production = config.nodeEnv === 'production';
  const message = production && statusCode >= 500
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
};
