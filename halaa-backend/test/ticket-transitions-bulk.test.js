const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const {
  TICKET_STATUS,
  TICKET_PRIORITY,
  TICKET_TRANSITIONS,
  isValidTicketStatusTransition,
  USER_STATUS,
  ROLES,
} = require("../src/shared/constants");

let mongod;
let User;
let Ticket;
let ticketsService;

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  User = require("../models/UserModel");
  Ticket = require("../models/TicketModel");
  ticketsService = require("../src/modules/tickets/tickets.service");
});

test.after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test("Session 2.4: Ticket State Machine & Transitions (ADM-05)", async () => {
  // 1. Transition rules matching specification
  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS), true);
  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.OPEN, TICKET_STATUS.RESOLVED), true);
  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.OPEN, TICKET_STATUS.CLOSED), true);
  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.OPEN, TICKET_STATUS.WAITING_RESPONSE), false);

  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.WAITING_RESPONSE), true);
  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.RESOLVED), true);
  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.CLOSED), true);
  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.OPEN), false);

  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.RESOLVED, TICKET_STATUS.IN_PROGRESS), true);
  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.RESOLVED, TICKET_STATUS.OPEN), true);
  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED), true);
  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.RESOLVED, TICKET_STATUS.WAITING_RESPONSE), false);

  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.CLOSED, TICKET_STATUS.OPEN), false);
  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.CLOSED, TICKET_STATUS.RESOLVED), false);
  assert.equal(isValidTicketStatusTransition(TICKET_STATUS.CLOSED, TICKET_STATUS.IN_PROGRESS), false);
});

test("Session 2.4: Ticket Reopen Semantics (ADM-05)", async () => {
  const user = await User.create({
    phoneNumber: "+966501112233",
    role: ROLES.HOST,
    accountType: "personal",
    status: USER_STATUS.ACTIVE,
  });

  const admin = await User.create({
    phoneNumber: "+966509998877",
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  });

  const ticket = await Ticket.create({
    user: user._id,
    subject: "Technical issue with event",
    message: "Cannot upload template images to my event.",
    type: "technical",
    priority: TICKET_PRIORITY.HIGH,
    status: TICKET_STATUS.OPEN,
  });

  // Transition: OPEN -> RESOLVED
  const resolveResult = await ticketsService.updateTicketStatus(
    ticket._id.toString(),
    TICKET_STATUS.RESOLVED,
    "Issue has been fixed by adjusting upload settings",
    admin._id
  );
  assert.equal(resolveResult.ticket.status, TICKET_STATUS.RESOLVED);
  assert.ok(resolveResult.ticket.resolvedAt);

  // Transition: RESOLVED -> IN_PROGRESS (Reopen via in_progress)
  const reopenInProgressResult = await ticketsService.updateTicketStatus(
    ticket._id.toString(),
    TICKET_STATUS.IN_PROGRESS,
    null,
    admin._id
  );
  assert.equal(reopenInProgressResult.ticket.status, TICKET_STATUS.IN_PROGRESS);

  // Re-resolve
  await ticketsService.updateTicketStatus(
    ticket._id.toString(),
    TICKET_STATUS.RESOLVED,
    "Resolved again",
    admin._id
  );

  // Transition: RESOLVED -> OPEN (Reopen via open)
  const reopenOpenResult = await ticketsService.updateTicketStatus(
    ticket._id.toString(),
    TICKET_STATUS.OPEN,
    null,
    admin._id
  );
  assert.equal(reopenOpenResult.ticket.status, TICKET_STATUS.OPEN);
});

test("Session 2.4: Bulk Ticket Status with Mixed Outcomes (ADM-07)", async () => {
  const user = await User.create({
    phoneNumber: "+966502223344",
    role: ROLES.HOST,
    accountType: "personal",
    status: USER_STATUS.ACTIVE,
  });

  const admin = await User.create({
    phoneNumber: "+966508887766",
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  });

  const t1 = await Ticket.create({
    user: user._id,
    subject: "Ticket 1",
    message: "Ticket 1 message description",
    type: "technical",
    status: TICKET_STATUS.OPEN,
  });

  const t2 = await Ticket.create({
    user: user._id,
    subject: "Ticket 2",
    message: "Ticket 2 message description",
    type: "payment",
    status: TICKET_STATUS.IN_PROGRESS,
  });

  const t3Closed = await Ticket.create({
    user: user._id,
    subject: "Ticket 3 Closed",
    message: "Ticket 3 message description",
    type: "inquiry",
    status: TICKET_STATUS.CLOSED,
  });

  const nonExistentId = new mongoose.Types.ObjectId().toString();

  const bulkResult = await ticketsService.bulkUpdateTicketStatus(
    [t1._id.toString(), t2._id.toString(), t3Closed._id.toString(), nonExistentId],
    TICKET_STATUS.RESOLVED,
    "Resolved in bulk",
    admin._id,
    true
  );

  assert.equal(bulkResult.success, true);
  assert.equal(bulkResult.count, 2);
  assert.equal(bulkResult.updatedCount, 2);
  assert.deepEqual(bulkResult.succeeded.sort(), [t1._id.toString(), t2._id.toString()].sort());
  assert.equal(bulkResult.failed.length, 2);

  const failedIds = bulkResult.failed.map((f) => f.id);
  assert.ok(failedIds.includes(t3Closed._id.toString()));
  assert.ok(failedIds.includes(nonExistentId));

  const updatedT1 = await Ticket.findById(t1._id);
  assert.equal(updatedT1.status, TICKET_STATUS.RESOLVED);

  const untouchedT3 = await Ticket.findById(t3Closed._id);
  assert.equal(untouchedT3.status, TICKET_STATUS.CLOSED);
});

test("Session 2.4: Bulk Ticket Delete (ADM-07)", async () => {
  const user = await User.create({
    phoneNumber: "+966503334455",
    role: ROLES.HOST,
    accountType: "personal",
    status: USER_STATUS.ACTIVE,
  });

  const otherUser = await User.create({
    phoneNumber: "+966504445566",
    role: ROLES.HOST,
    accountType: "personal",
    status: USER_STATUS.ACTIVE,
  });

  const t1 = await Ticket.create({
    user: user._id,
    subject: "Delete me 1",
    message: "Message for delete 1",
    type: "technical",
  });

  const t2 = await Ticket.create({
    user: otherUser._id,
    subject: "Other user ticket",
    message: "Message for other user",
    type: "technical",
  });

  const nonExistentId = new mongoose.Types.ObjectId().toString();

  // User tries to bulk delete t1 and otherUser's t2
  const userResult = await ticketsService.bulkDeleteTickets(
    [t1._id.toString(), t2._id.toString(), nonExistentId],
    user._id,
    false // not admin
  );

  assert.equal(userResult.success, true);
  assert.equal(userResult.count, 1);
  assert.equal(userResult.deletedCount, 1);
  assert.deepEqual(userResult.succeeded, [t1._id.toString()]);
  assert.equal(userResult.failed.length, 2);

  const deletedT1 = await Ticket.findById(t1._id);
  assert.equal(deletedT1, null);

  const untouchedT2 = await Ticket.findById(t2._id);
  assert.ok(untouchedT2);
});
