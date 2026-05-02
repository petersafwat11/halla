#!/usr/bin/env node
/**
 * Phase 3abc static-check smoke tests.
 *
 * No live backend host is available in this environment (same anomaly as
 * Phase 1 / Phase 2). These checks read the post-3abc source tree and
 * assert the contract specified in the prompts. A full Playwright run is
 * the runbook in `runbooks.md`, executed once a host is available.
 *
 * Each check prints `PASS` or `FAIL` with a one-line reason. Exit code is
 * non-zero if any FAIL.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const BACKEND = path.join(ROOT, "labbe-backend-");
const WEB = path.join(ROOT, "labbe");
const MOBILE = path.join(ROOT, "halla-mobile");

const failures = [];
const successes = [];

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), "utf8");
}

function check(name, fn) {
  try {
    const ok = fn();
    if (ok === true) {
      successes.push(name);
      console.log(`PASS — ${name}`);
    } else {
      failures.push(`${name}: ${ok || "false"}`);
      console.log(`FAIL — ${name}: ${ok || "false"}`);
    }
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
    console.log(`FAIL — ${name}: ${err.message}`);
  }
}

// ---------- 3a checks ----------

check("3a.1 — `failed` value present in EVENT_STATUS enum", () => {
  const statuses = read("labbe-backend-/src/shared/constants/status.js");
  return statuses.includes("FAILED: 'failed'") || "FAILED: 'failed' not found";
});

check("3a.1 — Event model status enum derives from EVENT_STATUS", () => {
  const evt = read("labbe-backend-/models/EventModel.js");
  return evt.includes("Object.values(EVENT_STATUS)") || "model not using EVENT_STATUS values";
});

check("3a.2 — scheduleEventLaunch sends BEFORE flipping to live (sendBulk before status='live')", () => {
  const tasks = read("labbe-backend-/src/shared/utils/scheduledTasks.js");
  // The new ordering uses runEventLaunch which calls sendBulk then sets status = 'live'.
  const sendIdx = tasks.indexOf("messagingService.sendBulk");
  const liveIdx = tasks.indexOf('fresh.status = "live"');
  if (sendIdx === -1) return "messagingService.sendBulk not found";
  if (liveIdx === -1) return 'fresh.status = "live" not found';
  return sendIdx < liveIdx || "sendBulk must come BEFORE status='live'";
});

check("3a.3 — eventLock utility exists and is acquired in cron", () => {
  const lock = read("labbe-backend-/src/shared/utils/eventLock.js");
  if (!lock.includes("acquire(eventId")) return "eventLock.acquire missing";
  const tasks = read("labbe-backend-/src/shared/utils/scheduledTasks.js");
  return tasks.includes("eventLock.acquire") || "scheduledTasks doesn't call eventLock.acquire";
});

check("3a.4 — events.service.createEvent has compensating releaseInvites on failure", () => {
  const svc = read("labbe-backend-/src/modules/events/events.service.js");
  return (
    svc.includes("Subscription.releaseInvites(capacitySub._id, guestCount)") ||
    "releaseInvites compensating return missing"
  );
});

check("3a.5 — taqnyatDeleteId removed from EventModel and cron skip branch", () => {
  const evt = read("labbe-backend-/models/EventModel.js");
  if (evt.includes("taqnyatDeleteId: Number")) return "taqnyatDeleteId still defined in model";
  const tasks = read("labbe-backend-/src/shared/utils/scheduledTasks.js");
  if (tasks.includes("event.launchSettings.taqnyatDeleteId")) return "cron still references taqnyatDeleteId";
  const msg = read("labbe-backend-/src/modules/messaging/messaging.service.js");
  if (msg.includes("'launchSettings.taqnyatDeleteId'")) return "messaging.scheduleBulkSend still writes taqnyatDeleteId";
  return true;
});

// ---------- 3b checks ----------

check("3b.1 — runBatched utility exists with concurrency + ratePerSecond", () => {
  const util = read("labbe-backend-/src/shared/utils/runBatched.js");
  return (
    (util.includes("concurrency") && util.includes("ratePerSecond")) ||
    "runBatched missing concurrency/ratePerSecond options"
  );
});

check("3b.1 — sendBulk uses runBatched, not the 100ms serial loop", () => {
  const msg = read("labbe-backend-/src/modules/messaging/messaging.service.js");
  if (!msg.includes("runBatched")) return "sendBulk does not import/use runBatched";
  if (msg.match(/await new Promise\(r => setTimeout\(r, 100\)\)/)) {
    return "100ms-per-guest delay still present in messaging.service";
  }
  return true;
});

check("3b.1 — scheduleGuestReminders uses runBatched (no 100ms serial loop)", () => {
  const tasks = read("labbe-backend-/src/shared/utils/scheduledTasks.js");
  if (!tasks.includes("runBatched(\n          guests,")) return "reminders not using runBatched";
  return true;
});

check("3b.2 — sendBulk wraps each per-guest send in withIdempotency with attempt-keyed namespace", () => {
  const msg = read("labbe-backend-/src/modules/messaging/messaging.service.js");
  return (
    msg.includes("withIdempotency") &&
    msg.includes("${scope}:${eventId}:${guestId}:${attemptCount}")
      ? true
      : "idempotency wiring or key shape missing in sendBulk"
  );
});

check("3b.3 — post-event sendBulkAccessEmails uses runBatched + idempotency", () => {
  const pe = read("labbe-backend-/src/modules/post-event/post-event.service.js");
  return (
    (pe.includes("runBatched") &&
      pe.includes("post_event_access:") &&
      pe.includes("withIdempotency")) ||
    "post-event bulk not using runBatched + idempotency"
  );
});

// ---------- 3c checks ----------

check("3c.1 — scheduleEventRetry cron is registered", () => {
  const tasks = read("labbe-backend-/src/shared/utils/scheduledTasks.js");
  if (!tasks.includes("scheduleEventRetry")) return "scheduleEventRetry not defined";
  if (!tasks.match(/scheduleEventRetry\(\);/)) return "scheduleEventRetry not initialized";
  return true;
});

check("3c.1 — manual retry endpoint POST /:id/retry-launch registered", () => {
  const routes = read("labbe-backend-/src/modules/events/events.routes.js");
  if (!routes.includes("retry-launch")) return "retry-launch route missing";
  const ctrl = read("labbe-backend-/src/modules/events/events.controller.js");
  if (!ctrl.includes("retryLaunch")) return "retryLaunch controller missing";
  const svc = read("labbe-backend-/src/modules/events/events.service.js");
  if (!svc.includes("retryEventLaunch")) return "retryEventLaunch service missing";
  return true;
});

check("3c.1 — retryEventLaunch service enforces RBAC (host / wl-admin / admin / super_admin)", () => {
  const svc = read("labbe-backend-/src/modules/events/events.service.js");
  return (
    svc.includes("isAdmin") &&
    svc.includes("isWhitelabelAdmin") &&
    svc.includes("ForbiddenError")
      ? true
      : "retryEventLaunch missing RBAC checks"
  );
});

check("3c.2 — terminal-fail handler dispatches notifications + audit row", () => {
  const tasks = read("labbe-backend-/src/shared/utils/scheduledTasks.js");
  return (
    tasks.includes("event.launch_failed_terminal") &&
    tasks.includes("notificationService.sendToUser") &&
    tasks.includes("notificationService.sendToAdmins")
      ? true
      : "terminal-fail handler missing notifications/audit"
  );
});

check("3c.3 — WhatsApp contact button (web) exists with wa.me link generator", () => {
  const w = read("labbe/ui/commen/whatsappButton/WhatsAppContactButton.jsx");
  return (
    (w.includes("wa.me/") && w.includes("WHATSAPP_CONTACT_NUMBER")) ||
    "WhatsAppContactButton (web) missing wa.me / number constant"
  );
});

check("3c.3 — WhatsApp contact button (mobile) exists with Linking.openURL", () => {
  const m = read("halla-mobile/components/shared/WhatsAppContactButton.js");
  return (
    (m.includes("wa.me/") && m.includes("Linking.openURL")) ||
    "WhatsAppContactButton (mobile) missing wa.me / Linking"
  );
});

check("3c.4 — web EventFailureBanner exists and is wired into host event page", () => {
  const banner = read("labbe/app/[lang]/host/events/[id]/_components/EventFailureBanner.jsx");
  if (!banner.includes("WhatsAppContactButton")) return "banner doesn't use WhatsAppContactButton";
  if (!banner.includes("retry-launch-button")) return "retry button data-testid missing";
  const page = read("labbe/app/[lang]/host/events/[id]/page.jsx");
  return page.includes("EventFailureBannerClient") || "page not wired";
});

check("3c.5 — mobile EventFailureBanner exists and is wired into EventDetails", () => {
  const banner = read("halla-mobile/components/events/EventFailureBanner.js");
  if (!banner.includes("WhatsAppContactButton")) return "mobile banner missing WA button";
  const det = read("halla-mobile/components/events/EventDetails.js");
  return det.includes("EventFailureBanner") || "mobile EventDetails not wired";
});

// ---------- summary ----------

console.log("");
console.log(`SUMMARY: ${successes.length} pass / ${failures.length} fail`);
if (failures.length) {
  console.log("");
  console.log("FAILURES:");
  failures.forEach((f) => console.log(" - " + f));
  process.exit(1);
}
process.exit(0);
