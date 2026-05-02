/**
 * Audit Admin Whitelabel Assignment Script — TENANT-F01 / Phase 0
 *
 * Reports any user whose role requires a whitelabelId but whose record is
 * missing one. After Phase 0, the filterByWhitelabel middleware refuses to
 * issue a query filter for ADMIN / MODERATOR / WHITELABEL_ADMIN /
 * WHITELABEL_MODERATOR users without a whitelabelId, so existing rows in
 * that state will see admin endpoints fail closed.
 *
 * READ-ONLY: this script does not modify any documents. It prints a list
 * Peter must review and assign manually before Phase 1.
 *
 * Usage: node scripts/audit-admin-whitelabel.js
 */

const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const User = require("../models/UserModel");
const { ROLES } = require("../src/shared/constants/roles");

const REQUIRES_WHITELABEL = [
  ROLES.ADMIN,
  ROLES.MODERATOR,
  ROLES.WHITELABEL_ADMIN,
  ROLES.WHITELABEL_MODERATOR,
];

async function connect() {
  const uri = process.env.DATABASE && process.env.DATABASE_PASSWORD
    ? process.env.DATABASE.replace("<PASSWORD>", process.env.DATABASE_PASSWORD)
    : process.env.DATABASE;

  if (!uri) {
    console.error("DATABASE env var is not set; cannot run audit.");
    process.exit(1);
  }

  await mongoose.connect(uri);
}

async function run() {
  await connect();

  const offenders = await User.find({
    role: { $in: REQUIRES_WHITELABEL },
    $or: [{ whitelabelId: null }, { whitelabelId: { $exists: false } }],
  })
    .select("_id email phoneNumber username name role status createdAt")
    .sort({ role: 1, createdAt: 1 })
    .lean();

  console.log("\n=============================================");
  console.log(" TENANT-F01 AUDIT — admins without whitelabelId");
  console.log("=============================================\n");

  if (offenders.length === 0) {
    console.log("OK — every admin/moderator user has a whitelabelId.\n");
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${offenders.length} user(s) missing whitelabelId:\n`);

  const byRole = offenders.reduce((acc, u) => {
    acc[u.role] = acc[u.role] || [];
    acc[u.role].push(u);
    return acc;
  }, {});

  Object.entries(byRole).forEach(([role, users]) => {
    console.log(`-- ${role} (${users.length}) --`);
    users.forEach((u) => {
      console.log(
        [
          `  _id=${u._id}`,
          `username=${u.username || ""}`,
          `name=${u.name || ""}`,
          `email=${u.email || ""}`,
          `phone=${u.phoneNumber || ""}`,
          `status=${u.status || ""}`,
          `createdAt=${u.createdAt ? new Date(u.createdAt).toISOString() : ""}`,
        ].join(" | ")
      );
    });
    console.log();
  });

  console.log("Action required (manual):");
  console.log("  1. Decide which whitelabel each user belongs to.");
  console.log("  2. Update User.whitelabelId for each row.");
  console.log("  3. Re-run this script to confirm zero offenders before Phase 1.\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
