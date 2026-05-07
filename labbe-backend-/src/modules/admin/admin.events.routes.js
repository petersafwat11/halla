const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { requirePageAccess } = require('../../shared/middleware/rbac');
const { ADMIN_PAGES } = require('../../shared/constants');
const { validateObjectId, validateZod } = require('../../shared/middleware/validation');
const { filterByWhitelabel } = require('../../shared/middleware/whitelabel');
const { auditLog } = require('../../shared/middleware/auditLog');
const { bulkOperationLimiter } = require('../../shared/middleware/rateLimiter');
const adminValidation = require('./admin.validation');

// ============================================
// EVENT MANAGEMENT (ADMIN)
// ============================================

/**
 * @swagger
 * /admin/events/create-for-host:
 *   post:
 *     summary: Create event for host
 *     description: Create a new event on behalf of a host. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hostId, eventDetails]
 *             properties:
 *               hostId: { type: string }
 *               eventDetails: { type: object }
 *     responses:
 *       201:
 *         description: Event created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/events/create-for-host',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'create'),
  filterByWhitelabel,
  adminController.createEventForHost
);

/**
 * @swagger
 * /admin/events/{id}/status:
 *   patch:
 *     summary: Update event status
 *     description: Update the status of an event. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event not found
 */
router.patch('/events/:id/status',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'update'),
  validateObjectId('id'),
  filterByWhitelabel,
  validateZod(adminValidation.updateEventStatusSchema),
  auditLog({
    action: 'event.status_change',
    targetType: 'event',
    targetIdFrom: (req) => req.params.id,
    changesFrom: (req) => ({ after: { status: req.body?.status } }),
  }),
  adminController.updateEventStatus
);

/**
 * @swagger
 * /admin/events/{id}:
 *   delete:
 *     summary: Delete event
 *     description: Delete an event by ID. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event not found
 */
router.delete('/events/:id',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'delete'),
  validateObjectId('id'),
  filterByWhitelabel,
  auditLog({
    action: 'event.delete',
    targetType: 'event',
    targetIdFrom: (req) => req.params.id,
  }),
  adminController.deleteEvent
);

/**
 * @swagger
 * /admin/events/bulk-delete:
 *   post:
 *     summary: Bulk delete events
 *     description: Delete multiple events at once. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Events deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/events/bulk-delete',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'delete'),
  bulkOperationLimiter,
  filterByWhitelabel,
  validateZod(adminValidation.bulkDeleteEventsSchema),
  auditLog({
    action: 'event.bulk_delete',
    targetType: 'event',
    metadataFrom: (req) => ({ ids: req.body?.ids }),
  }),
  adminController.bulkDeleteEvents
);

/**
 * @swagger
 * /admin/events/bulk-status:
 *   post:
 *     summary: Bulk update event status
 *     description: Update the status of multiple events at once. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids, status]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string }
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Events status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/events/bulk-status',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'update'),
  bulkOperationLimiter,
  filterByWhitelabel,
  validateZod(adminValidation.bulkEventStatusSchema),
  auditLog({
    action: 'event.bulk_status_change',
    targetType: 'event',
    metadataFrom: (req) => ({ ids: req.body?.ids, status: req.body?.status }),
  }),
  adminController.bulkUpdateEventStatus
);

/**
 * @swagger
 * /admin/event-targets:
 *   get:
 *     summary: Get event targets
 *     description: Retrieve hosts or whitelabels available as event targets for admin event creation. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [hosts, whitelabels] }
 *     responses:
 *       200:
 *         description: List of event targets
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/event-targets',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'view'),
  filterByWhitelabel,
  adminController.getEventTargets
);

/**
 * @swagger
 * /admin/users/{id}/subscription-info:
 *   get:
 *     summary: Get user subscription info
 *     description: Retrieve active subscription details for a host user. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Subscription info
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.get('/users/:id/subscription-info',
  requirePageAccess(ADMIN_PAGES.HOSTS, 'view'),
  validateObjectId('id'),
  adminController.getUserSubscriptionInfo
);

/**
 * @swagger
 * /admin/events/export:
 *   get:
 *     summary: Export events
 *     description: Export admin events as CSV/XLSX. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Events export file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/events/export',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'view'),
  filterByWhitelabel,
  adminController.exportEvents
);

/**
 * @swagger
 * /admin/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     description: Retrieve a single admin-managed event by ID. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event not found
 */
router.get('/events/:id',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'view'),
  validateObjectId('id'),
  filterByWhitelabel,
  adminController.getEventById
);

/**
 * @swagger
 * /admin/events/{id}:
 *   patch:
 *     summary: Update event (full)
 *     description: Update all editable fields of an event including guest list. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               eventDetails: { type: string, description: JSON-stringified event fields }
 *     responses:
 *       200:
 *         description: Event updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event not found
 */
router.patch('/events/:id',
  requirePageAccess(ADMIN_PAGES.EVENTS, 'update'),
  validateObjectId('id'),
  filterByWhitelabel,
  auditLog({
    action: 'event.update',
    targetType: 'event',
    targetIdFrom: (req) => req.params.id,
  }),
  adminController.updateEventFull
);

module.exports = router;
