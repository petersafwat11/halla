#!/usr/bin/env node
const crypto = require("crypto");
const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("../../src/config/database");
const deletionService = require("../../src/modules/account-deletion/deletion.service");
const User = require("../../models/UserModel");
const RefreshToken = require("../../models/RefreshTokenModel");
const Notification = require("../../models/NotificationModel");
const ProcessorErasure = require("../../models/ProcessorErasureModel");
const AccountDeletionRequest = require("../../models/AccountDeletionRequestModel");

async function main() {
  if (!process.argv.includes("--execute") || process.env.PRIVACY_DELETION_CANARY_CONFIRMED !== "true") {
    throw new Error("canary creation/deletion requires --execute and PRIVACY_DELETION_CANARY_CONFIRMED=true");
  }
  await connectDB();
  const marker = crypto.randomUUID();
  const email = `privacy-canary-${marker}@example.invalid`;
  const user = await User.create({
    name: `Privacy Canary ${marker}`,
    email,
    password: crypto.randomBytes(24).toString("base64url"),
    role: "host",
    accountType: "personal",
  });
  await RefreshToken.create({ userId: user._id, tokenHash: crypto.createHash("sha256").update(marker).digest("hex"), expiresAt: new Date(Date.now() + 86400000) });
  await Notification.collection.insertOne({ userId: user._id, title: "canary", message: marker, createdAt: new Date(), updatedAt: new Date() });

  const request = await deletionService.runDeletion({ userId: user._id, channel: "support" });
  const rawUser = await User.collection.findOne({ _id: user._id });
  const checks = {
    deletionReachedTerminalState: ["completed", "pending_retry"].includes(request.status),
    accountMarkedDeleted: rawUser?.status === "deleted",
    emailRemoved: !rawUser?.email,
    nameAnonymized: rawUser?.name === "Deleted User",
    passwordRemoved: !rawUser?.password,
    refreshTokensRemoved: (await RefreshToken.countDocuments({ userId: user._id })) === 0,
    notificationsRemoved: (await Notification.countDocuments({ userId: user._id })) === 0,
    durableRequestPresent: (await AccountDeletionRequest.countDocuments({ requestId: request.requestId })) === 1,
    processorObligationsRecorded: (await ProcessorErasure.countDocuments({ deletionRequestId: request.requestId })) > 0,
    noCanaryMarkerInUser: !JSON.stringify(rawUser || {}).includes(marker),
  };
  const passed = Object.values(checks).every(Boolean);
  console.log(JSON.stringify({ passed, requestId: request.requestId, status: request.status, checks }, null, 2));
  if (!passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  if (mongoose.connection.readyState) await disconnectDB().catch(() => {});
});
