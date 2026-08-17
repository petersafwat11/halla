#!/usr/bin/env node
"use strict";

const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../config.env") });

const { connectDB, disconnectDB } = require("../src/config/database");
const Guest = require("../models/GuestModel");
const Event = require("../models/EventModel");
const TaqnyatTemplate = require("../models/TaqnyatTemplateModel");
const {
  TEMPLATE_FAMILY_TO_EVENT_CATEGORY,
} = require("@halaa/shared/constants/eventCategories.cjs");
const {
  isObsoleteHalaInvitationTemplateName,
} = require("../src/modules/taqnyat-templates/taqnyat-template-capabilities");

const APPLY = process.argv.includes("--apply");
const REPLY_MODES = ["reply_and_qr", "reply_only"];

async function countLegacyState() {
  const obsoleteTemplateIds = (
    await TaqnyatTemplate.find({}).select("_id templateName").lean()
  )
    .filter((template) =>
      isObsoleteHalaInvitationTemplateName(template.templateName)
    )
    .map((template) => template._id);
  const [guestResponses, qrEvents, expectedReplies, legacyInvitationModes, eventsUsingObsoleteTemplates] =
    await Promise.all([
      Guest.countDocuments({
        $or: [{ status: "maybe" }, { "rsvp.response": "maybe" }],
      }),
      Event.countDocuments({ invitationType: "qr_only" }),
      Event.countDocuments({ "guestReplies.onExpected": { $exists: true } }),
      Event.collection.countDocuments({ invitationType: { $exists: false } }),
      Event.countDocuments({
        "taqnyatTemplate.templateRef": { $in: obsoleteTemplateIds },
      }),
    ]);
  return {
    guestResponses,
    qrEvents,
    expectedReplies,
    legacyInvitationModes,
    obsoleteTemplates: obsoleteTemplateIds.length,
    eventsUsingObsoleteTemplates,
  };
}

async function assignApprovedReplacements() {
  const replacements = await TaqnyatTemplate.find({
    type: "invite",
    invitationMode: { $in: REPLY_MODES },
    status: "APPROVED",
    active: true,
    removedFromMeta: { $ne: true },
    templateName: /_ar_v2$/,
  })
    .select("_id category invitationMode templateName")
    .lean();

  const assignments = [];
  for (const template of replacements) {
    const eventCategories = /^halaa_general_event_/i.test(template.templateName)
      ? ["other", "graduation", "meeting"]
      : [template.category];
    const result = await Event.updateMany(
      {
        "eventDetails.type": { $in: eventCategories },
        invitationType: template.invitationMode,
      },
      { $set: { "taqnyatTemplate.templateRef": template._id } }
    );
    assignments.push({
      templateName: template.templateName,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  }
  return assignments;
}

async function alignOwnerTemplateCategories() {
  const changes = [];
  for (const [family, category] of Object.entries(
    TEMPLATE_FAMILY_TO_EVENT_CATEGORY
  )) {
    const result = await TaqnyatTemplate.updateMany(
      {
        templateName: new RegExp(
          `^halaa_${family}_(plain|reply_qr|reply_only)_ar_v[12]$`,
          "i"
        ),
      },
      { $set: { category } }
    );
    changes.push({ family, category, modified: result.modifiedCount });
  }
  return changes;
}

async function migrate() {
  await connectDB();
  try {
    const before = await countLegacyState();
    if (!APPLY) {
      console.log(JSON.stringify({ mode: "dry-run", before }, null, 2));
      return;
    }

    const guestResult = await Guest.updateMany(
      { $or: [{ status: "maybe" }, { "rsvp.response": "maybe" }] },
      {
        $set: { status: "invited", "rsvp.responded": false },
        $unset: { "rsvp.response": "", "rsvp.respondedAt": "" },
      }
    );

    const qrEventResult = await Event.updateMany(
      { invitationType: "qr_only" },
      {
        $set: { invitationType: "none" },
        $unset: { "taqnyatTemplate.templateRef": "" },
      }
    );

    const legacyModeResult = await Event.collection.updateMany(
      { invitationType: { $exists: false } },
      { $set: { invitationType: "reply_and_qr" } }
    );

    const replyFieldResult = await Event.collection.updateMany(
      { "guestReplies.onExpected": { $exists: true } },
      { $unset: { "guestReplies.onExpected": "" } }
    );

    const obsoleteTemplateIds = (
      await TaqnyatTemplate.find({}).select("_id templateName").lean()
    )
      .filter((template) =>
        isObsoleteHalaInvitationTemplateName(template.templateName)
      )
      .map((template) => template._id);

    await Event.updateMany(
      { "taqnyatTemplate.templateRef": { $in: obsoleteTemplateIds } },
      { $unset: { "taqnyatTemplate.templateRef": "" } }
    );

    const obsoleteResult = await TaqnyatTemplate.deleteMany({
      _id: { $in: obsoleteTemplateIds },
    });

    const categoryAlignment = await alignOwnerTemplateCategories();

    const assignments = await assignApprovedReplacements();
    const after = await countLegacyState();

    console.log(
      JSON.stringify(
        {
          mode: "apply",
          before,
          changed: {
            guests: guestResult.modifiedCount,
            qrEvents: qrEventResult.modifiedCount,
            legacyInvitationModes: legacyModeResult.modifiedCount,
            eventReplyFields: replyFieldResult.modifiedCount,
            obsoleteTemplatesDeleted: obsoleteResult.deletedCount,
          },
          categoryAlignment,
          approvedReplacementAssignments: assignments,
          after,
        },
        null,
        2
      )
    );
  } finally {
    await disconnectDB();
  }
}

migrate().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
