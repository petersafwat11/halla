/**
 * syncTaqnyatTemplates — Phase 4c W0-MODEL daily cron
 *
 * Runs every day at 03:30 Riyadh-equivalent (cron uses server local).
 * Pulls the Taqnyat upstream template list and upserts the cache so the
 * host StepFour list stays current without an admin pressing the manual
 * Sync button.
 *
 * Registered from `scheduledTasks.initScheduledTasks` so it lifecycles
 * with the server boot. Uses the same in-process node-cron the rest of
 * the platform uses (per PHASE_4C_PLAN §0 row 14).
 */

const cron = require("node-cron");
const service = require("../modules/taqnyat-templates/taqnyat-templates.service");

let registered = false;

function scheduleTaqnyatTemplateSync() {
  if (registered) return;
  registered = true;

  // Daily at 03:30 server time — outside the busy launch cron window
  // (which runs every minute) and well before the morning cron stack at
  // 06:00 / 08:00 / 09:00.
  cron.schedule("30 3 * * *", async () => {
    try {
      console.log("[Cron] taqnyat-template sync — start");
      const result = await service.syncFromTaqnyat({ actor: { _id: null, role: "system" } });
      console.log(`[Cron] taqnyat-template sync — upserted ${result.count}`);
    } catch (err) {
      console.error("[Cron] taqnyat-template sync FAILED:", err.message);
    }
  });
}

module.exports = { scheduleTaqnyatTemplateSync };
