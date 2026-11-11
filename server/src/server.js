import app from './app.js';
import { config } from './config/env.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`🚀 JalGyan Server running in ${config.nodeEnv} mode on port ${PORT}`);
  console.log(`👉 Health check: http://localhost:${PORT}/api/health`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error(`💡 Note for macOS: macOS ControlCenter (AirPlay Receiver) listens on port 5000 by default.`);
    console.error(`   Disable AirPlay Receiver in System Settings > General > AirDrop & AirPlay, or specify PORT in server/.env.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});
