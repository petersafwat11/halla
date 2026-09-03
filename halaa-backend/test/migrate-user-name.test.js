const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const db = require("./helpers/memoryDb");
const { runMigration } = require("../scripts/migrate-user-name");

test.before(async () => {
  await db.start();
});

test.after(async () => {
  await db.stop();
});

test("migrate-user-name dry-run does not mutate documents", async () => {
  const usersCollection = mongoose.connection.db.collection("users");
  await usersCollection.deleteMany({});

  await usersCollection.insertOne({
    phoneNumber: "+966501112222",
    username: "dry_run_user",
    role: "host",
    status: "active",
  });

  const report = await runMigration({ execute: false });
  assert.equal(report.scanned, 1);
  assert.equal(report.copied, 1);

  // Assert document is untouched in dry-run
  const doc = await usersCollection.findOne({ phoneNumber: "+966501112222" });
  assert.equal(doc.username, "dry_run_user");
  assert.equal(doc.name, undefined);
});

test("migrate-user-name execute copies username to name and unsets username", async () => {
  const usersCollection = mongoose.connection.db.collection("users");
  await usersCollection.deleteMany({});

  await usersCollection.insertMany([
    {
      phoneNumber: "+966501112233",
      username: "legacy_user",
      role: "host",
      status: "active",
    },
    {
      phoneNumber: "+966501112244",
      name: "Existing Name",
      username: "old_handle",
      role: "host",
      status: "active",
    },
  ]);

  const report = await runMigration({ execute: true });
  assert.equal(report.scanned, 2);
  assert.equal(report.copied, 1);
  assert.equal(report.alreadyNamed, 1);
  assert.equal(report.unset, 2);

  const doc1 = await usersCollection.findOne({ phoneNumber: "+966501112233" });
  assert.equal(doc1.name, "legacy_user");
  assert.equal(doc1.username, undefined);

  const doc2 = await usersCollection.findOne({ phoneNumber: "+966501112244" });
  assert.equal(doc2.name, "Existing Name");
  assert.equal(doc2.username, undefined);
});
