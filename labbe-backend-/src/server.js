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

      // PIPELINE-F02: confirm HMAC verification on /messaging/webhook is
      // wired. WHATSAPP_APP_SECRET is required and validated by env.js, so
      // reaching this point with an empty secret is a programmer error.
      if (process.env.WHATSAPP_APP_SECRET) {
        console.log(
          '🔐 WhatsApp webhook HMAC verification: ACTIVE (fail-closed on missing or invalid x-hub-signature-256)'
        );
      } else {
        console.error(
          '⚠️  WhatsApp webhook HMAC verification: NO SECRET — requests will be rejected. This should be unreachable.'
        );
      }
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
