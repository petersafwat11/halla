/**
 * Drop stale `slug` unique index from templatecategories collection.
 * The schema no longer has a `slug` field, but a leftover unique index
 * blocks any new category because all documents get `slug: null` which
 * violates the unique constraint after the first one.
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "config.env") });

const DATABASE = process.env.DATABASE;
const CERT_PATH = process.env.DATABASE_CERT_PATH;

async function dropStaleIndex() {
  const opts = {};
  if (CERT_PATH) {
    opts.tls = true;
    opts.tlsCertificateKeyFile = path.resolve(__dirname, "..", CERT_PATH);
  }

  console.log("[drop-index] Connecting to", DATABASE.replace(/\?.*/, "?***"));
  await mongoose.connect(DATABASE, opts);

  const db = mongoose.connection.db;
  const collection = db.collection("templatecategories");

  const indexes = await collection.indexes();
  console.log("[drop-index] Current indexes:");
  indexes.forEach((idx) => console.log("  ", JSON.stringify(idx.key), idx.unique ? "(unique)" : ""));

  const slugIndex = indexes.find((idx) => idx.key.slug !== undefined);
  if (slugIndex) {
    await collection.dropIndex(slugIndex.name);
    console.log("[drop-index] Dropped index:", slugIndex.name);
  } else {
    console.log("[drop-index] No slug index found — nothing to drop.");
  }

  await mongoose.disconnect();
  console.log("[drop-index] Done.");
}

dropStaleIndex().catch((err) => {
  console.error("[drop-index] Error:", err);
  process.exit(1);
});
