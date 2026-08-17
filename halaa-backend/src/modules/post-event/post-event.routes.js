/**
 * Post-Event Content Routes — parent mounter.
 * @module modules/post-event/post-event.routes
 */

/**
 * @swagger
 * tags:
 *   name: Post-Event
 *   description: Post-event content sharing and gallery endpoints
 */

const express = require("express");
const router = express.Router();

const guestRoutes = require("./post-event.guest.routes");
const hostRoutes = require("./post-event.host.routes");

router.use(guestRoutes);
router.use(hostRoutes);

module.exports = router;
