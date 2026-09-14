/**
 * Ticket attachment (image OR video) integration proof.
 *
 * Drives the REAL tickets service against an ephemeral MongoMemoryReplSet with
 * local multer-shaped file objects. It never touches the shared database or
 * writes upload files.
 *
 * Proves:
 *   1. An image attachment persists as a local reference and is exposed as a
 *      stable /uploads URL on every read path.
 *   2. A video attachment is typed "video".
 *   3. No file → attachment is null (JSON-only path unaffected).
 *   4. The async _formatTicket ripple (Promise.all in list) returns signed URLs.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const db = require("./helpers/memoryDb");

const ticketsService = require("../src/modules/tickets/tickets.service");
const Ticket = require("../models/TicketModel");
const { resolveLocalPath } = require("../src/shared/utils/localStorage");

const PUBLIC_PREFIX = "/uploads/";

const hostUser = () => ({
  _id: new mongoose.Types.ObjectId(),
  role: "host",
  phoneNumber: "+966500000000",
});

// Insert a minimal users doc so Ticket.populate("user") resolves on read
// (getTicketById/getTickets populate the creator, as they do in production).
const seedHost = async () => {
  const user = hostUser();
  await mongoose.connection.collection("users").insertOne({
    _id: user._id,
    role: user.role,
    email: `test-host-${user._id}@example.com`,
    phoneNumber: user.phoneNumber,
  });
  return user;
};

const baseTicket = {
  subject: "Cannot open my event",
  type: "technical",
  message: "The event page shows a blank screen after login.",
};

// Shapes mirror multer.diskStorage output.
const imageFile = (uid) => ({
  path: resolveLocalPath(`tickets/${uid}/screenshot-1700000000000-abcd1234.jpg`),
  mimetype: "image/jpeg",
  size: 204800,
});
const videoFile = (uid) => ({
  path: resolveLocalPath(`tickets/${uid}/screen-recording-1700000000000-abcd1234.mp4`),
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

test("image attachment persists and serves a stable local URL", async () => {
  const user = await seedHost();
  const file = imageFile(user._id.toString());

  const { ticket } = await ticketsService.createTicket({ ...baseTicket }, user, file);

  // Serialized (read) shape returns a public URL, not the bare key.
  assert.ok(ticket.attachment, "attachment should be present");
  assert.equal(ticket.attachment.type, "image");
  assert.equal(ticket.attachment.mimeType, "image/jpeg");
  assert.equal(ticket.attachment.size, 204800);
  assert.ok(
    ticket.attachment.url.startsWith(PUBLIC_PREFIX),
    `url should be a public local path, got ${ticket.attachment.url}`
  );
  assert.ok(
    ticket.attachment.url.endsWith(".jpg"),
    `url should retain its extension, got ${ticket.attachment.url}`
  );

  // Stored shape persists the stable local reference.
  const raw = await Ticket.findById(ticket.id).lean();
  assert.equal(raw.attachment.url, ticket.attachment.url);
  assert.equal(raw.attachment.type, "image");
});

test("video attachment is typed video and resolves locally", async () => {
  const user = await seedHost();
  const file = videoFile(user._id.toString());

  const { ticket } = await ticketsService.createTicket({ ...baseTicket }, user, file);

  assert.equal(ticket.attachment.type, "video");
  assert.equal(ticket.attachment.mimeType, "video/mp4");
  assert.ok(ticket.attachment.url.startsWith(PUBLIC_PREFIX));
});

test("mixed attachments: stores and returns up to four images and videos", async () => {
  const user = await seedHost();
  const files = [
    imageFile(`${user._id}-1`),
    videoFile(`${user._id}-2`),
    imageFile(`${user._id}-3`),
    videoFile(`${user._id}-4`),
  ];

  const { ticket } = await ticketsService.createTicket({ ...baseTicket }, user, files);

  assert.equal(ticket.attachments.length, 4);
  assert.deepEqual(ticket.attachments.map(item => item.type), ["image", "video", "image", "video"]);
  assert.equal(ticket.attachment.url, ticket.attachments[0].url);
  assert.ok(ticket.attachments.every(item => item.url.startsWith(PUBLIC_PREFIX)));
});

test("no attachment: JSON-only create leaves attachment null", async () => {
  const user = await seedHost();

  const { ticket } = await ticketsService.createTicket({ ...baseTicket }, user);

  assert.equal(ticket.attachment, null);

  // And nothing empty was persisted.
  const raw = await Ticket.findById(ticket.id).lean();
  assert.ok(!raw.attachment || !raw.attachment.url);
});

test("getTicketById returns the local attachment URL", async () => {
  const user = await seedHost();
  const file = imageFile(user._id.toString());
  const { ticket: created } = await ticketsService.createTicket({ ...baseTicket }, user, file);

  const { ticket } = await ticketsService.getTicketById(created.id, user._id, false);

  assert.ok(ticket.attachment.url.startsWith(PUBLIC_PREFIX));
  assert.ok(ticket.attachment.url.endsWith(".jpg"));
});

test("list path resolves every local attachment", async () => {
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
      t.attachment.url.startsWith(PUBLIC_PREFIX),
      "each listed attachment should be a local public URL"
    );
  }
  assert.ok(["image", "video"].includes(withAttachment[0].attachment.type));
});

test("access control: another non-admin user cannot access ticket attachment", async () => {
  const owner = await seedHost();
  const anotherUser = await seedHost();
  const file = imageFile(owner._id.toString());
  const { ticket: created } = await ticketsService.createTicket({ ...baseTicket }, owner, file);

  await assert.rejects(
    async () => {
      await ticketsService.getTicketById(created.id, anotherUser._id, false);
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, "FORBIDDEN");
      return true;
    }
  );
});

test("admin access returns the owner's local attachment", async () => {
  const owner = await seedHost();
  const adminId = new mongoose.Types.ObjectId();
  const file = videoFile(owner._id.toString());
  const { ticket: created } = await ticketsService.createTicket({ ...baseTicket }, owner, file);

  const { ticket } = await ticketsService.getTicketById(created.id, adminId, true);

  assert.ok(ticket.attachment);
  assert.equal(ticket.attachment.type, "video");
  assert.ok(ticket.attachment.url.startsWith(PUBLIC_PREFIX));
});

test("media filter: allows supported image and video formats, rejects unsupported MIME/extension", () => {
  const { mediaFilter } = require("../src/shared/utils/localUpload");

  const validFiles = [
    { mimetype: "image/jpeg", originalname: "photo.jpg" },
    { mimetype: "image/png", originalname: "screenshot.png" },
    { mimetype: "video/mp4", originalname: "recording.mp4" },
    { mimetype: "video/quicktime", originalname: "clip.mov" },
    { mimetype: "video/webm", originalname: "clip.webm" },
  ];

  for (const file of validFiles) {
    let accepted = false;
    mediaFilter({}, file, (err, pass) => {
      assert.equal(err, null);
      accepted = pass;
    });
    assert.equal(accepted, true, `Expected ${file.originalname} to be accepted`);
  }

  const invalidFiles = [
    { mimetype: "application/pdf", originalname: "document.pdf" },
    { mimetype: "application/zip", originalname: "archive.zip" },
    { mimetype: "text/plain", originalname: "notes.txt" },
    { mimetype: "application/x-msdownload", originalname: "script.exe" },
    { mimetype: "image/jpeg", originalname: "fake.exe" }, // Mismatched extension
  ];

  for (const file of invalidFiles) {
    let caughtErr = null;
    mediaFilter({}, file, (err, pass) => {
      caughtErr = err;
    });
    assert.ok(caughtErr, `Expected ${file.originalname} to be rejected`);
  }
});

