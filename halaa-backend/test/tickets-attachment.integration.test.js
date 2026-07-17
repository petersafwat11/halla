/**
 * Ticket attachment (image OR video) integration proof.
 *
 * Drives the REAL tickets service against an ephemeral MongoMemoryReplSet with
 * the AWS_S3_BASE_URL env set so signStoredImage produces public URLs. NEVER
 * touches the shared staging/production cluster and NEVER calls real S3 (the
 * multer-s3 `file` object is supplied directly, exactly as the upload
 * middleware would hand it to the controller).
 *
 * Proves:
 *   1. An image attachment persists as an S3 KEY and is signed to a public URL
 *      on read (create + getById + list all sign it).
 *   2. A video attachment is typed "video".
 *   3. No file → attachment is null (JSON-only path unaffected).
 *   4. The async _formatTicket ripple (Promise.all in list) returns signed URLs.
 */

// Set before requiring s3Upload so signStoredImage has a base URL to build from.
process.env.AWS_S3_BASE_URL =
  process.env.AWS_S3_BASE_URL || "https://hallamangement.s3.eu-north-1.amazonaws.com";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const db = require("./helpers/memoryDb");

const ticketsService = require("../src/modules/tickets/tickets.service");
const Ticket = require("../models/TicketModel");

const BASE_URL = process.env.AWS_S3_BASE_URL;

const hostUser = () => ({
  _id: new mongoose.Types.ObjectId(),
  role: "host",
  username: "test-host",
  phoneNumber: "+966500000000",
});

// Insert a minimal users doc so Ticket.populate("user") resolves on read
// (getTicketById/getTickets populate the creator, as they do in production).
const seedHost = async () => {
  const user = hostUser();
  await mongoose.connection.collection("users").insertOne({
    _id: user._id,
    role: user.role,
    username: user.username,
    email: "test-host@example.com",
    phoneNumber: user.phoneNumber,
  });
  return user;
};

const baseTicket = {
  subject: "Cannot open my event",
  type: "technical",
  message: "The event page shows a blank screen after login.",
};

// Shapes mirror a multer-s3 upload: `.key` is the stored S3 object key.
const imageFile = (uid) => ({
  key: `tickets/${uid}/screenshot-1700000000000-abcd1234.jpg`,
  mimetype: "image/jpeg",
  size: 204800,
});
const videoFile = (uid) => ({
  key: `tickets/${uid}/screen-recording-1700000000000-abcd1234.mp4`,
  mimetype: "video/mp4",
  size: 8_388_608,
});

test.before(async () => {
  await db.start();
});
test.after(async () => {
  await db.stop();
});
test.beforeEach(async () => {
  await db.clearAll();
});

test("image attachment: persists S3 key, serves signed public URL on create", async () => {
  const user = await seedHost();
  const file = imageFile(user._id.toString());

  const { ticket } = await ticketsService.createTicket({ ...baseTicket }, user, file);

  // Serialized (read) shape returns a public URL, not the bare key.
  assert.ok(ticket.attachment, "attachment should be present");
  assert.equal(ticket.attachment.type, "image");
  assert.equal(ticket.attachment.mimeType, "image/jpeg");
  assert.equal(ticket.attachment.size, 204800);
  assert.ok(
    ticket.attachment.url.startsWith(BASE_URL),
    `url should be a public bucket URL, got ${ticket.attachment.url}`
  );
  assert.ok(
    ticket.attachment.url.endsWith(file.key),
    `url should end with the stored key, got ${ticket.attachment.url}`
  );

  // Stored shape persists the bare KEY (so reads can always re-sign).
  const raw = await Ticket.findById(ticket.id).lean();
  assert.equal(raw.attachment.url, file.key);
  assert.equal(raw.attachment.type, "image");
});

test("video attachment: typed 'video' and signed on read", async () => {
  const user = await seedHost();
  const file = videoFile(user._id.toString());

  const { ticket } = await ticketsService.createTicket({ ...baseTicket }, user, file);

  assert.equal(ticket.attachment.type, "video");
  assert.equal(ticket.attachment.mimeType, "video/mp4");
  assert.ok(ticket.attachment.url.endsWith(file.key));
});

test("no attachment: JSON-only create leaves attachment null", async () => {
  const user = await seedHost();

  const { ticket } = await ticketsService.createTicket({ ...baseTicket }, user);

  assert.equal(ticket.attachment, null);

  // And nothing empty was persisted.
  const raw = await Ticket.findById(ticket.id).lean();
  assert.ok(!raw.attachment || !raw.attachment.url);
});

test("getTicketById (owner) returns a signed attachment URL", async () => {
  const user = await seedHost();
  const file = imageFile(user._id.toString());
  const { ticket: created } = await ticketsService.createTicket({ ...baseTicket }, user, file);

  const { ticket } = await ticketsService.getTicketById(created.id, user._id, false);

  assert.ok(ticket.attachment.url.startsWith(BASE_URL));
  assert.ok(ticket.attachment.url.endsWith(file.key));
});

test("list path (async _formatTicket via Promise.all) signs each attachment", async () => {
  const user = await seedHost();
  await ticketsService.createTicket({ ...baseTicket }, user, imageFile(user._id.toString()));
  await ticketsService.createTicket({ ...baseTicket }, user, videoFile(user._id.toString()));
  await ticketsService.createTicket({ ...baseTicket }, user); // no attachment

  const { data } = await ticketsService.getTickets(user._id, false);

  assert.equal(data.length, 3);
  const withAttachment = data.filter((t) => t.attachment);
  assert.equal(withAttachment.length, 2);
  for (const t of withAttachment) {
    assert.ok(
      t.attachment.url.startsWith(BASE_URL),
      "each listed attachment should be a signed public URL"
    );
  }
  assert.ok(["image", "video"].includes(withAttachment[0].attachment.type));
});
