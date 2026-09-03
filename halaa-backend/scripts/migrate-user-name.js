/**
 * Migration Script: Migrate user-domain username to name (PR1R)
 *
 * Scans all User documents. If name is missing/empty and username is non-empty,
 * copies the trimmed username to name.
 * Validates that every active user has either a valid name or a role-specific
 * display value (such as vendor brandName).
 * Unsets username from every user document.
 *
 * Usage:
 *   node scripts/migrate-user-name.js --dry-run
 *   node scripts/migrate-user-name.js --execute
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../config.env") });

const MONGODB_URI = process.env.DATABASE
  ? process.env.DATABASE.replace("<PASSWORD>", process.env.DATABASE_PASSWORD)
  : (process.env.MONGODB_URI || "mongodb://localhost:27017/labbe");

async function runMigration(options = {}) {
  const isExecute = options.execute === true || process.argv.includes("--execute");

  const modeLabel = isExecute ? "EXECUTE" : "DRY-RUN";
  console.log(`[migrate-user-name] Running in ${modeLabel} mode...`);

  let shouldCloseConnection = false;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
    shouldCloseConnection = true;
  }

  try {
    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // Scan all user documents, bypassing Mongoose schema casting
    const cursor = usersCollection.find({});
    let scanned = 0;
    let copied = 0;
    let alreadyNamed = 0;
    let invalidEmpty = 0;
    let unset = 0;
    const remediationIds = [];

    const bulkOps = [];

    while (await cursor.hasNext()) {
      const user = await cursor.next();
      scanned++;

      const rawName = typeof user.name === "string" ? user.name.trim() : "";
      const rawUsername = typeof user.username === "string" ? user.username.trim() : "";
      const hasUsername = Boolean(rawUsername || user.username !== undefined);

      let effectiveName = rawName;
      let willCopy = false;

      if (!effectiveName && rawUsername) {
        effectiveName = rawUsername;
        willCopy = true;
        copied++;
      } else if (effectiveName) {
        alreadyNamed++;
      }

      // Role-specific check: vendor brandName
      const brandName = typeof user.brandName === "string" ? user.brandName.trim() : "";
      const isActive = user.status !== "deleted" && user.isDeleted !== true && user.status !== "suspended";

      if (isActive && !effectiveName && !brandName) {
        invalidEmpty++;
        remediationIds.push(String(user._id));
      }

      if (hasUsername) {
        unset++;
      }

      if (isExecute) {
        const updateDoc = {};
        if (willCopy) {
          updateDoc.$set = updateDoc.$set || {};
          updateDoc.$set.name = effectiveName;
        }
        if (hasUsername) {
          updateDoc.$unset = updateDoc.$unset || {};
          updateDoc.$unset.username = "";
        }

        if (Object.keys(updateDoc).length > 0) {
          bulkOps.push({
            updateOne: {
              filter: { _id: user._id },
              update: updateDoc,
            },
          });
        }
      }
    }

    console.log(`[migrate-user-name] Summary:`);
    console.log(`  Scanned:       ${scanned}`);
    console.log(`  Copied:        ${copied}`);
    console.log(`  Already named: ${alreadyNamed}`);
    console.log(`  Invalid/empty: ${invalidEmpty}`);
    console.log(`  Unset targets: ${unset}`);

    if (invalidEmpty > 0) {
      console.error(`[migrate-user-name] ABORT: ${invalidEmpty} active user(s) have neither name nor role display name.`);
      console.error(`[migrate-user-name] Remediation Report (IDs only):`);
      for (const id of remediationIds) {
        console.error(`  - ${id}`);
      }
      if (isExecute) {
        throw new Error("Migration aborted due to invalid/empty active users.");
      }
    }

    if (isExecute && bulkOps.length > 0) {
      console.log(`[migrate-user-name] Executing ${bulkOps.length} updates in bulk...`);
      const res = await usersCollection.bulkWrite(bulkOps);
      console.log(`[migrate-user-name] Bulk write complete. Modified: ${res.modifiedCount}`);
    } else if (!isExecute) {
      console.log(`[migrate-user-name] Dry-run completed. No data was modified.`);
    }

    return { scanned, copied, alreadyNamed, invalidEmpty, unset, remediationIds };
  } finally {
    if (shouldCloseConnection) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`[migrate-user-name] Fatal:`, err.message);
      process.exit(1);
    });
}

module.exports = { runMigration };
