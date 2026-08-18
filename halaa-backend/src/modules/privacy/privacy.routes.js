const express = require("express");
const { requirePageAccess } = require("../../shared/middleware/rbac");
const { ADMIN_PAGES } = require("../../shared/constants");
const controller = require("./privacy.admin.controller");

const router = express.Router();
router.use(requirePageAccess(ADMIN_PAGES.SETTINGS, "manage"));
router.get("/privacy/policy", controller.getPolicy);
router.get("/privacy/retention-runs", controller.listRetentionRuns);
router.post("/privacy/retention-runs", controller.runRetention);
router.get("/privacy/legal-holds", controller.listLegalHolds);
router.post("/privacy/legal-holds", controller.createLegalHold);
router.post("/privacy/legal-holds/:id/release", controller.releaseLegalHold);
router.get("/privacy/processor-erasures", controller.listProcessorErasures);
router.patch("/privacy/processor-erasures/:id", controller.resolveProcessorErasure);

module.exports = router;
