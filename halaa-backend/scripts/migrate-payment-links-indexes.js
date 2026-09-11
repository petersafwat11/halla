/* Additive index deployment. No syncIndexes, drops, backfill or financial mutations. */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'config.env') });
const path = require('path');
const mongoose = require('mongoose');
const PaymentLink = require('../models/PaymentLinkModel');

async function run() {
  if (!process.argv.includes('--apply')) {
    console.log('Dry run: would create PaymentLink indexes and payments.paymentLinkId_1.');
    console.log('Run with --apply against the intended DATABASE before enabling creation.');
    return;
  }
  if (!process.env.DATABASE) throw new Error('DATABASE is required');
  const uri = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD || '');
  const options = { autoIndex: false };
  if (process.env.DATABASE_CERT_PATH) {
    options.tls = true;
    options.tlsCertificateKeyFile = path.resolve(__dirname, '..', process.env.DATABASE_CERT_PATH);
  }
  await mongoose.connect(uri, options);
  try {
    await PaymentLink.createIndexes();
    await mongoose.connection.collection('payments').createIndex({ paymentLinkId: 1 }, { sparse: true });
    console.log('Payment-link indexes created. Existing data and other indexes were preserved.');
  } finally { await mongoose.disconnect(); }
}
run().catch(() => {
  // Do not print connection strings or records from duplicate-index errors.
  console.error('Payment-link index deployment failed. Check connection and index conflicts before enabling creation.');
  process.exitCode = 1;
});
