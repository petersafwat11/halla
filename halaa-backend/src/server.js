/**
 * Server Entry Point
 * Minimal server startup
 * @module server
 */

const config = require('./config');
const { connectDB } = require('./config/database');
const createApp = require('./app');
const { initScheduledTasks } = require('./shared/utils/scheduledTasks');
const { assertProductionConfigOrWarn } = require('./shared/utils/readiness');

// Ensure business-account models are registered with Mongoose before app starts
require('../models/BusinessSetupFeeModel');
require('../models/BusinessPlanAssignmentModel');

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Validate production config before doing anything else. Warns on missing
    // required secrets / allowed origins; fails closed (exits) when
    // STRICT_CONFIG=true so an incomplete deploy can't go live. (§3.2)
    assertProductionConfigOrWarn();

    // Connect to database
    await connectDB();

    // Fail-closed account-type assertion (non-blocking). Surfaces any
    // {role:host, accountType:null} docs for monitoring. [#13]
    const { assertNoNullAccountTypeHosts } = require('./shared/utils/accountTypeAssertion');
    assertNoNullAccountTypeHosts().catch(() => {});

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

      // WhatsApp webhook HMAC verification (§3.2). Enforced/fail-closed in
      // production; skipped only in non-production when no secret is set.
      const waSecretSet = Boolean(process.env.WHATSAPP_APP_SECRET);
      const waUnsignedAllowed =
        String(process.env.WHATSAPP_WEBHOOK_ALLOW_UNSIGNED ?? 'true').toLowerCase() !==
        'false';
      if (config.env === 'production') {
        console.log(
          waUnsignedAllowed
            ? '⚠️  WhatsApp webhook HMAC verification: TEMPORARILY DISABLED (unsigned callbacks accepted)'
            : waSecretSet
            ? '🔒 WhatsApp webhook HMAC verification: ENABLED'
            : '⛔ WhatsApp webhook HMAC verification: WHATSAPP_APP_SECRET missing — /messaging/webhook will REJECT all calls (fail closed). Set the secret to receive RSVP replies.'
        );
      } else {
        console.log(
          waSecretSet
            ? '🔒 WhatsApp webhook HMAC verification: ENABLED'
            : '⚠️  WhatsApp webhook HMAC verification: SKIPPED (non-production, secret not set)'
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
