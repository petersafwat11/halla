/**
 * Migration: Partial Unique Indexes for User Mobile and Email
 *
 * Drops the old global unique indexes on `mobile` and `email` on the `users`
 * collection and rebuilds them with `partialFilterExpression: { mobile: { $type: "string" }, deletedAt: null }`.
 *
 * This allows soft-deleted accounts to be retained in the database for auditing
 * without blocking re-registration of the same phone number or email.
 */

const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("../src/config/database");

async function migrateIndexes() {
  console.log("Connecting to database...");
  await connectDB();
  const db = mongoose.connection.db;
  const usersCollection = db.collection("users");

  console.log("\n1. Fetching current indexes on 'users' collection...");
  const currentIndexes = await usersCollection.indexes();
  console.log(
    "Existing index names:",
    currentIndexes.map((idx) => idx.name)
  );

  // Check and drop legacy mobile_1 index if it's missing partialFilterExpression
  const existingMobileIdx = currentIndexes.find((idx) => idx.name === "mobile_1");
  if (existingMobileIdx) {
    const hasPartial = existingMobileIdx.partialFilterExpression && existingMobileIdx.partialFilterExpression.deletedAt === null;
    if (!hasPartial) {
      console.log("\n2. Dropping legacy 'mobile_1' index...");
      await usersCollection.dropIndex("mobile_1");
      console.log("✅ Successfully dropped legacy 'mobile_1'");
    } else {
      console.log("\n2. 'mobile_1' already has correct partialFilterExpression, skipping drop.");
    }
  }

  // Check and drop legacy email_1 index if it's missing partialFilterExpression
  const existingEmailIdx = currentIndexes.find((idx) => idx.name === "email_1");
  if (existingEmailIdx) {
    const hasPartial = existingEmailIdx.partialFilterExpression && existingEmailIdx.partialFilterExpression.deletedAt === null;
    if (!hasPartial) {
      console.log("\n3. Dropping legacy 'email_1' index...");
      await usersCollection.dropIndex("email_1");
      console.log("✅ Successfully dropped legacy 'email_1'");
    } else {
      console.log("\n3. 'email_1' already has correct partialFilterExpression, skipping drop.");
    }
  }

  // Create new partial unique index on mobile
  console.log("\n4. Creating partial unique index on 'mobile'...");
  await usersCollection.createIndex(
    { mobile: 1 },
    {
      name: "mobile_1",
      unique: true,
      partialFilterExpression: {
        mobile: { $type: "string" },
        deletedAt: null,
      },
      background: true,
    }
  );
  console.log("✅ Created partial unique index 'mobile_1'");

  // Create new partial unique index on email
  console.log("\n5. Creating partial unique index on 'email'...");
  await usersCollection.createIndex(
    { email: 1 },
    {
      name: "email_1",
      unique: true,
      collation: { locale: "en", strength: 2 },
      partialFilterExpression: {
        email: { $type: "string" },
        deletedAt: null,
      },
      background: true,
    }
  );
  console.log("✅ Created partial unique index 'email_1'");

  console.log("\n6. Verifying updated indexes on 'users' collection:");
  const updatedIndexes = await usersCollection.indexes();
  for (const idx of updatedIndexes) {
    if (idx.name === "mobile_1" || idx.name === "email_1") {
      console.log(`- Index: ${idx.name}`);
      console.log(`  Unique: ${idx.unique}`);
      console.log(`  PartialFilterExpression:`, JSON.stringify(idx.partialFilterExpression));
    }
  }

  console.log("\n✅ Migration completed successfully!");
  await disconnectDB();
}

migrateIndexes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
