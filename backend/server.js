/**
 * File: server.js
 * Purpose: Server entry point
 * Layer: Config
 * Notes:
 * - Starts the Express server
 * - Handles graceful shutdown
 * - Follows project coding standards
 */

const app = require('./app');  // ✅ Correct - app.js is in same folder (root)

require('dotenv').config();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
    🚀 Server is running!
    📡 Port: ${PORT}
    🌍 Environment: ${process.env.NODE_ENV || 'development'}
    📅 Started at: ${new Date().toLocaleString()}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
