/**
 * Server entry point.
 */
const app = require('./app');
const config = require('./config');
const { connectDB, sequelize } = require('./db');

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Sync models (development only, use migrations in production)
    if (config.app.debug) {
      await sequelize.sync({ alter: true });
      console.log('Database models synchronized.');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 ${config.app.name} server running on port ${PORT}`);
      console.log(`📝 Environment: ${config.app.debug ? 'development' : 'production'}`);
      console.log(`🔗 API available at http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

startServer();

