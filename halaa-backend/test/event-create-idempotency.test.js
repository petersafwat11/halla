const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const memoryDb = require("./helpers/memoryDb");
const createApp = require("../src/app");
const config = require("../src/config");

const User = require("../models/UserModel");
const Plan = require("../models/PlanModel");
const Subscription = require("../models/SubscriptionModel");
const Event = require("../models/EventModel");
const IdempotencyKey = require("../models/IdempotencyKeyModel");
const TaqnyatTemplate = require("../models/TaqnyatTemplateModel");
const logger = require("../src/shared/utils/logger");
const { ROLES, USER_STATUS, ACCOUNT_TYPES } = require("../src/shared/constants");

let server;
let baseUrl;
let hostUser;
let hostToken;
let testTaqnyatTemplate;

test.before(async () => {
  await memoryDb.start();

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Seed test plan & subscription
  const plan = await Plan.create({
    nameAr: "خطة غير محدودة",
    nameEn: "Unlimited Plan",
    code: "test_unlimited",
    planType: "unlimited",
    pricing: { oneTime: 0 },
    limits: { maxEvents: -1, durationDays: 9999 },
    features: { whatsAppTemplates: 10 },
    isActive: true,
  });

  hostUser = await User.create({
    email: "idemp_host@labbe.sa",
    phoneNumber: "511223344",
    name: "Idempotency Host",
    password: "password123",
    role: ROLES.HOST,
    accountType: ACCOUNT_TYPES.PERSONAL,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
  });

  const sub = await Subscription.createForUser(hostUser._id, plan, {
    status: "active",
    pricePaid: 0,
    invitePool: 1000,
    invitesConsumed: 0,
  });
  hostUser.subscription = sub._id;
  await hostUser.save({ validateBeforeSave: false });

  testTaqnyatTemplate = await TaqnyatTemplate.create({
    taqnyatId: "taq_test_123",
    templateName: "test_wedding_invite",
    language: "ar",
    status: "APPROVED",
    category: "wedding",
    type: "invite",
    invitationModes: ["none", "reply_and_qr"],
    buttons: [],
    bodyText: "مرحبا {{1}}",
  });

  hostToken = jwt.sign({ id: hostUser._id }, config.jwt.secret, {
    expiresIn: "1h",
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await memoryDb.stop();
});

test("missing Idempotency-Key header returns 400 IDEMPOTENCY_KEY_REQUIRED", async () => {
  const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
  const payload = {
    eventDetails: {
      title: "No Key Event",
      type: "wedding",
      date: futureDate,
      time: "20:00",
      location: { address: "Riyadh Hall 1", latitude: 24.7136, longitude: 46.6753 },
    },
    guestList: [{ name: "Guest One", phone: "0500000001" }],
    invitationType: "none",
    taqnyatTemplate: {
      templateRef: testTaqnyatTemplate._id,
    },
  };

  const res = await fetch(`${baseUrl}/api/v2/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.code, "IDEMPOTENCY_KEY_REQUIRED");
  assert.ok(data.message.includes("Idempotency-Key"));
});

test("concurrent duplicate requests create exactly 1 event and return the same result", async () => {
  const key = `test-concurrent-${Date.now()}`;
  const futureDate = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString();
  const payload = {
    eventDetails: {
      title: "Concurrent Event",
      type: "wedding",
      date: futureDate,
      time: "19:00",
      location: { address: "Grand Ballroom", latitude: 24.7136, longitude: 46.6753 },
    },
    guestList: [{ name: "Guest A", phone: "0500000002" }],
    invitationType: "none",
    taqnyatTemplate: {
      templateRef: testTaqnyatTemplate._id,
    },
  };

  const makeReq = () =>
    fetch(`${baseUrl}/api/v2/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hostToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify(payload),
    });

  // Fire concurrently
  const [res1, res2] = await Promise.all([makeReq(), makeReq()]);

  assert.equal(res1.status, 201);
  assert.equal(res2.status, 201);

  const json1 = await res1.json();
  const json2 = await res2.json();

  const id1 = json1.data?.event?._id || json1.event?._id || json1.data?._id;
  const id2 = json2.data?.event?._id || json2.event?._id || json2.data?._id;

  assert.ok(id1, "First request returned event id");
  assert.equal(id1, id2, "Both responses returned identical event ID");

  // Check database has exactly 1 event with this title
  const eventsInDb = await Event.find({ "eventDetails.title": "Concurrent Event" });
  assert.equal(eventsInDb.length, 1, "Exactly one event was created in DB");
});

test("subsequent replay returns cached response and IdempotencyKey record is completed", async () => {
  const key = `test-replay-${Date.now()}`;
  const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
  const payload = {
    eventDetails: {
      title: "Replay Event",
      type: "wedding",
      date: futureDate,
      time: "20:00",
      location: { address: "Palace", latitude: 24.7136, longitude: 46.6753 },
    },
    guestList: [{ name: "Guest R", phone: "0500000003" }],
    invitationType: "none",
    taqnyatTemplate: {
      templateRef: testTaqnyatTemplate._id,
    },
  };

  const headers = {
    Authorization: `Bearer ${hostToken}`,
    "Content-Type": "application/json",
    "Idempotency-Key": key,
  };

  const res1 = await fetch(`${baseUrl}/api/v2/events`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  assert.equal(res1.status, 201);
  const data1 = await res1.json();

  // Replay
  const res2 = await fetch(`${baseUrl}/api/v2/events`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  assert.equal(res2.status, 201);
  const data2 = await res2.json();

  assert.deepEqual(data1, data2);

  const keyDoc = await IdempotencyKey.findOne({ key });
  assert.ok(keyDoc);
  assert.equal(keyDoc.status, "completed");
  assert.equal(keyDoc.response?.status, 201);
});

test("reusing same key with different payload returns 409 IDEMPOTENCY_CONFLICT", async () => {
  const key = `test-conflict-${Date.now()}`;
  const futureDate = new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString();
  const payload1 = {
    eventDetails: {
      title: "Original Payload",
      type: "wedding",
      date: futureDate,
      time: "18:00",
      location: { address: "Hall 1", latitude: 24.7136, longitude: 46.6753 },
    },
    guestList: [{ name: "Guest 1", phone: "0500000010" }],
    invitationType: "none",
    taqnyatTemplate: {
      templateRef: testTaqnyatTemplate._id,
    },
  };
  const payload2 = {
    eventDetails: {
      title: "Mismatched Payload",
      type: "wedding",
      date: futureDate,
      time: "18:00",
      location: { address: "Hall 2", latitude: 24.7136, longitude: 46.6753 },
    },
    guestList: [{ name: "Guest 2", phone: "0500000020" }],
    invitationType: "none",
    taqnyatTemplate: {
      templateRef: testTaqnyatTemplate._id,
    },
  };

  const res1 = await fetch(`${baseUrl}/api/v2/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify(payload1),
  });
  assert.equal(res1.status, 201);

  const res2 = await fetch(`${baseUrl}/api/v2/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify(payload2),
  });
  assert.equal(res2.status, 409);
  const data2 = await res2.json();
  assert.equal(data2.code, "IDEMPOTENCY_CONFLICT");
});

test("event creation logs privacy-safe stage durations without PII", async () => {
  const key = `test-durations-${Date.now()}`;
  const futureDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
  const payload = {
    eventDetails: {
      title: "Secret Private Party",
      type: "wedding",
      date: futureDate,
      time: "19:00",
      location: { address: "Secret Location", latitude: 24.7136, longitude: 46.6753 },
    },
    guestList: [{ name: "Private VIP Person", phone: "0500000099" }],
    invitationType: "none",
    taqnyatTemplate: {
      templateRef: testTaqnyatTemplate._id,
    },
  };

  const logEntries = [];
  const originalInfo = logger.info;
  logger.info = (msg, meta) => {
    logEntries.push({ msg, meta });
    return originalInfo.call(logger, msg, meta);
  };

  try {
    const res = await fetch(`${baseUrl}/api/v2/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hostToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 201);

    const durationLog = logEntries.find((entry) => entry.msg === "[event.create] stage durations");
    assert.ok(durationLog, "Found stage durations log entry");
    assert.ok(durationLog.meta?.durations, "Durations object present");
    const { durations } = durationLog.meta;

    assert.equal(typeof durations.validation, "number");
    assert.equal(typeof durations.imageHandling, "number");
    assert.equal(typeof durations.eventWrite, "number");
    assert.equal(typeof durations.guestWrite, "number");
    assert.equal(typeof durations.responseAssembly, "number");
    assert.equal(typeof durations.total, "number");

    // Assert NO PII in the duration log
    const serialized = JSON.stringify(durationLog);
    assert.ok(!serialized.includes("Secret Private Party"), "Title not logged");
    assert.ok(!serialized.includes("Private VIP Person"), "Guest name not logged");
    assert.ok(!serialized.includes("0500000099"), "Guest phone not logged");
  } finally {
    logger.info = originalInfo;
  }
});

test("duplicate replay cleans up uploaded file", async () => {
  const fileUpload = require("../src/shared/utils/fileUpload");
  let cleanedUp = false;
  const originalDelete = fileUpload.deleteFile;
  fileUpload.deleteFile = async (path) => {
    cleanedUp = true;
    return originalDelete ? originalDelete(path) : Promise.resolve();
  };

  try {
    const { idempotency } = require("../src/shared/middleware/idempotency");
    const middleware = idempotency({ scope: "test.cleanup", required: true });

    const key = `test-file-clean-${Date.now()}`;
    const req1 = {
      method: "POST",
      get: (h) => (h.toLowerCase() === "idempotency-key" ? key : null),
      body: { hello: "world" },
      user: { _id: hostUser._id },
      file: { path: "/tmp/fake-original.jpg", originalname: "invitation.jpg", size: 12345 },
    };
    const res1 = {
      statusCode: 201,
      json: (b) => b,
      on: () => {},
    };

    await middleware(req1, res1, () => {
      res1.json({ success: true });
    });

    await new Promise((r) => setTimeout(r, 60));

    const req2 = {
      method: "POST",
      get: (h) => (h.toLowerCase() === "idempotency-key" ? key : null),
      body: { hello: "world" },
      user: { _id: hostUser._id },
      file: { path: "/tmp/fake-duplicate-upload.jpg", originalname: "invitation.jpg", size: 12345 },
    };
    let resStatus = 0;
    const res2 = {
      status: (code) => {
        resStatus = code;
        return {
          json: () => {},
        };
      },
    };

    await middleware(req2, res2, () => {});
    assert.ok(cleanedUp, "Cleaned up uploaded file on duplicate replay");
  } finally {
    fileUpload.deleteFile = originalDelete;
  }
});

test("file fingerprint includes uploaded bytes, not only name and size", async () => {
  const { getFileFingerprint } = require("../src/shared/middleware/idempotency");
  const common = { originalname: "invitation.jpg", size: 4, mimetype: "image/jpeg" };
  const first = await getFileFingerprint({ ...common, buffer: Buffer.from("AAAA") });
  const second = await getFileFingerprint({ ...common, buffer: Buffer.from("BBBB") });
  assert.notEqual(first.contentHash, second.contentHash);
});

test("client disconnect does not release a pending idempotency reservation", async () => {
  const { idempotency } = require("../src/shared/middleware/idempotency");
  const key = `test-disconnect-${Date.now()}`;
  let closeHandler = null;
  const req = {
    method: "POST",
    get: (name) => (name.toLowerCase() === "idempotency-key" ? key : null),
    body: { event: "still-committing" },
    user: { _id: hostUser._id },
  };
  const res = {
    statusCode: 201,
    json: (body) => body,
    on: (event, handler) => { if (event === "close") closeHandler = handler; },
  };
  await idempotency({ scope: "test.disconnect", required: true })(req, res, () => {});
  if (closeHandler) closeHandler();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const reservation = await IdempotencyKey.findOne({ key, scope: "test.disconnect" });
  assert.ok(reservation);
  assert.equal(reservation.status, "pending");
});
