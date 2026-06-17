require('dotenv').config({ path: './config.env' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.DATABASE
  ? process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)
  : process.env.MONGODB_URI;

async function run() {
  const mongoOptions = {};
  if (process.env.DATABASE_CERT_PATH) {
    mongoOptions.tls = true;
    mongoOptions.tlsCertificateKeyFile = process.env.DATABASE_CERT_PATH;
  }
  await mongoose.connect(MONGODB_URI, mongoOptions);
  console.log('Connected to MongoDB');

  // List collections
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:');
  console.log(collections.map(c => c.name));

  // Get counts for ScheduledExtraReminder if it exists
  try {
    const count = await mongoose.connection.db.collection('scheduledextrareminders').countDocuments();
    console.log(`scheduledextrareminders count: ${count}`);
  } catch (err) {
    console.log('scheduledextrareminders collection does not exist or error:', err.message);
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
