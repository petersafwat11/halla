const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { requirePageAccess } = require('../../shared/middleware/rbac');
const { ADMIN_PAGES } = require('../../shared/constants');
const { validateObjectId, validateZod } = require('../../shared/middleware/validation');
const { auditLog } = require('../../shared/middleware/auditLog');
const { bulkOperationLimiter } = require('../../shared/middleware/rateLimiter');
const adminValidation = require('./admin.validation');

// ============================================
// VENDOR MANAGEMENT
// ============================================

/**
 * @swagger
 * /admin/vendors:
 *   get:
 *     summary: Get all vendors
 *     description: Retrieve a paginated list of all vendors. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of vendors
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/vendors',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'view'),
  adminController.getVendors
);

/**
 * @swagger
 * /admin/vendors/{id}:
 *   get:
 *     summary: Get vendor by ID
 *     description: Retrieve a single vendor by their ID. Admin only.
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
 *         description: Vendor details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
/**
 * @swagger
 * /admin/vendors/export:
 *   get:
 *     summary: Export vendors
 *     description: Export vendors list as CSV/XLSX. Admin only.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Vendors export file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/vendors/export',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'view'),
  adminController.exportVendors
);

router.get('/vendors/:id',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'view'),
  validateObjectId('id'),
  adminController.getVendorById
);

/**
 * @swagger
 * /admin/vendors/{id}/status:
 *   patch:
 *     summary: Update vendor status
 *     description: Update the status of a vendor. Admin only.
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
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Vendor status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.patch('/vendors/:id/status',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'update'),
  validateObjectId('id'),
  validateZod(adminValidation.updateVendorStatusSchema),
  auditLog({
    action: 'vendor.status_change',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
    captureBefore: async (req) => {
      const User = require('../../../models/UserModel');
      const prior = await User.findById(req.params.id).select('status').lean();
      return prior?.status || null;
    },
    changesFrom: (req) => ({ after: { status: req.body?.status } }),
  }),
  adminController.updateVendorStatus
);

/**
 * @swagger
 * /admin/vendors/{id}/rating:
 *   patch:
 *     summary: Update vendor rating
 *     description: Update the rating of a vendor. Admin only.
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
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating: { type: number }
 *     responses:
 *       200:
 *         description: Vendor rating updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.patch('/vendors/:id/rating',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'update'),
  validateObjectId('id'),
  validateZod(adminValidation.updateVendorRatingSchema),
  auditLog({
    action: 'vendor.rating_change',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
    changesFrom: (req) => ({ after: { rating: req.body?.rating } }),
  }),
  adminController.updateVendorRating
);

/**
 * @swagger
 * /admin/vendors/{id}:
 *   delete:
 *     summary: Delete vendor
 *     description: Delete a vendor by ID. Admin only.
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
 *         description: Vendor deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 */
router.delete('/vendors/:id',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'delete'),
  validateObjectId('id'),
  auditLog({
    action: 'vendor.delete',
    targetType: 'user',
    targetIdFrom: (req) => req.params.id,
  }),
  adminController.deleteVendor
);

/**
 * @swagger
 * /admin/vendors/bulk-delete:
 *   post:
 *     summary: Bulk delete vendors
 *     description: Delete multiple vendors at once. Admin only.
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
 *         description: Vendors deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/vendors/bulk-delete',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'delete'),
  bulkOperationLimiter,
  validateZod(adminValidation.bulkDeleteVendorsSchema),
  auditLog({
    action: 'vendor.bulk_delete',
    targetType: 'user',
    metadataFrom: (req) => ({ ids: req.body?.ids }),
  }),
  adminController.bulkDeleteVendors
);

/**
 * @swagger
 * /admin/vendors/bulk-status:
 *   post:
 *     summary: Bulk update vendor status
 *     description: Update status of multiple vendors at once. Admin only.
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
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Vendor statuses updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/vendors/bulk-status',
  requirePageAccess(ADMIN_PAGES.VENDORS, 'update'),
  bulkOperationLimiter,
  validateZod(adminValidation.bulkVendorStatusSchema),
  auditLog({
    action: 'vendor.bulk_status_change',
    targetType: 'user',
    metadataFrom: (req) => ({ ids: req.body?.ids, status: req.body?.status }),
  }),
  adminController.bulkUpdateVendorStatus
);

module.exports = router;
