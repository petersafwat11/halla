/**
 * Database Configuration
 * MongoDB connection setup using Mongoose
 * @module config/database
 */

const dns = require('dns');
const mongoose = require('mongoose');
const config = require('./index');

// Use Google public DNS — the default router DNS cannot resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

/**
 * Connect to MongoDB
 * @returns {Promise<mongoose.Connection>}
 */
const connectDB = async () => {
  try {
    let connectionString = config.db.url;

    // Legacy username/password auth: replace <PASSWORD> placeholder
    if (config.db.password && connectionString.includes('<PASSWORD>')) {
      connectionString = connectionString.replace('<PASSWORD>', config.db.password);
    }

    // Build Mongoose options — add TLS cert for X.509 auth if configured
    const mongooseOptions = { ...config.db.options };
    if (config.db.certPath) {
      mongooseOptions.tls = true;
      mongooseOptions.tlsCertificateKeyFile = config.db.certPath;
    }

    const conn = await mongoose.connect(connectionString, mongooseOptions);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
};

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected gracefully');
  } catch (error) {
    console.error('❌ MongoDB disconnect error:', error.message);
    throw error;
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
