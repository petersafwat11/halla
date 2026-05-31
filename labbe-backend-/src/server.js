/**
 * Server Entry Point
 * Minimal server startup
 * @module server
 */

const config = require('./config');
const { connectDB } = require('./config/database');
const createApp = require('./app');
const { initScheduledTasks } = require('./shared/utils/scheduledTasks');

// Ensure BusinessSetupFeeModel is registered with Mongoose before app starts
require('../models/BusinessSetupFeeModel');

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start all cron jobs (event lifecycle, bulk send, reminders, template polling)
    initScheduledTasks();

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════╗
║  🚀 Server running on port ${config.port}            ║
║  📍 Environment: ${config.env.padEnd(22)}║
║  🔗 http://localhost:${config.port}                 ║
╚════════════════════════════════════════════╝
      `);

      // WhatsApp webhook HMAC verification is TEMPORARILY DISABLED
      // (2026-06-01). See messaging.webhook.controller.js for the rationale
      // and how to re-enable it.
      console.log(
        '⚠️  WhatsApp webhook HMAC verification: DISABLED — accepting all payloads on /messaging/webhook'
      );
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (err) => {
      console.error('💥 UNHANDLED REJECTION! Shutting down...');
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('💤 Process terminated!');
      });
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start if run directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer };
