/**
 * Add canonical aliases to legacy event.visualTemplate.fieldValues.
 *
 * Existing keys are preserved so already-created events never lose data.
 * The migration only copies a legacy value when the canonical destination is
 * absent. Default is read-only; --apply is required for writes.
 */

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const mongoose = require("mongoose");
const Event = require("../models/EventModel");

const APPLY = process.argv.includes("--apply");

const KEY_ALIASES = {
  weddingDate: "eventDate",
  partyDate: "eventDate",
  engagementDate: "eventDate",
  birthDate: "eventDate",
  weddingTime: "eventTime",
  partyTime: "eventTime",
  engagementTime: "eventTime",
  guestMessage: "invitationMessage",
  hisName: "groomName",
  herName: "brideName",
  groomFamilyName: "groomName",
  brideFamilyName: "brideName",
  parents: "parentsNames",
  hostessName: "hostName",
  conferenceTitle: "eventTitle",
  organizerName: "hostName",
};

async function connect() {
  let database = process.env.DATABASE;
  if (!database) throw new Error("DATABASE is not configured");
  if (process.env.DATABASE_PASSWORD && database.includes("<PASSWORD>")) {
    database = database.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);
  }
  const options = {};
  if (process.env.DATABASE_CERT_PATH) {
    options.tls = true;
    options.tlsCertificateKeyFile = process.env.DATABASE_CERT_PATH;
  }
  await mongoose.connect(database, options);
}

async function main() {
  console.log(`[event-keys] mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  await connect();

  const events = await Event.find({ "visualTemplate.fieldValues": { $exists: true } })
    .select("_id status visualTemplate.fieldValues visualTemplate.templateRef")
    .lean();

  let changed = 0;
  for (const event of events) {
    const values = event.visualTemplate?.fieldValues || {};
    const additions = {};
    for (const [legacyKey, canonicalKey] of Object.entries(KEY_ALIASES)) {
      if (
        Object.prototype.hasOwnProperty.call(values, legacyKey) &&
        !Object.prototype.hasOwnProperty.call(values, canonicalKey)
      ) {
        additions[canonicalKey] = values[legacyKey];
      }
    }
    if (!Object.keys(additions).length) continue;
    changed += 1;
    console.log(`[event-keys] ${APPLY ? "update" : "would update"} ${event._id} status=${event.status || "unknown"} add=${Object.keys(additions).join(",")}`);
    if (APPLY) {
      const set = Object.fromEntries(
        Object.entries(additions).map(([key, value]) => [`visualTemplate.fieldValues.${key}`, value])
      );
      await Event.updateOne({ _id: event._id }, { $set: set });
    }
  }

  console.log(`[event-keys] summary: scanned=${events.length}, ${APPLY ? "updated" : "would update"}=${changed}`);
}

main()
  .catch((error) => {
    console.error("[event-keys] FAILED:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });

