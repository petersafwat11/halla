/**
 * Admin Vendors Service
 * Vendor management operations for the admin module.
 */

const User = require('../../../models/UserModel');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const { ROLES, USER_STATUS, VENDOR_STATUS } = require('../../shared/constants');
const notificationService = require('../notifications/notifications.service');
const config = require('../../config');
const email = require('../../../email');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { buildSearchQuery, buildDateRangeQuery, formatUserResponse } = require('./admin.shared.service');

/**
 * Get all vendors with pagination and filters
 */
async function getVendors({ page = 1, limit = 10, search, status, category, from, to, whitelabelId }) {
  const skip = (page - 1) * limit;

  let query = { role: ROLES.VENDOR };

  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  if (search) {
    const searchQuery = buildSearchQuery(search, [
      'name',
      'email',
      'phoneNumber',
      'profile.vendorData.brandName',
    ]);
    query = { ...query, ...searchQuery };
  }

  if (status) {
    query['profile.vendorData.vendorStatus'] = status;
  }

  if (category) {
    query['profile.vendorData.serviceCategories'] = category;
  }

  const dateRange = buildDateRangeQuery(from, to);
  if (Object.keys(dateRange).length > 0) {
    query.createdAt = dateRange;
  }

  const [vendors, total] = await Promise.all([
    User.find(query)
      .select('-password -passwordResetToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    vendors: vendors.map(v => formatUserResponse(v)),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get vendor by ID
 */
async function getVendorById(vendorId, whitelabelId) {
  const query = { _id: vendorId, role: ROLES.VENDOR };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  const vendor = await User.findOne(query)
    .select('-password -passwordResetToken')
    .lean();

  if (!vendor) {
    throw new NotFoundError('Vendor');
  }

  return {
    ...formatUserResponse(vendor),
    vendorData: vendor.profile?.vendorData || {},
  };
}

/**
 * Update vendor status (approve/reject/suspend)
 */
async function updateVendorStatus(vendorId, vendorStatus, whitelabelId, actorId = null) {
  const query = { _id: vendorId, role: ROLES.VENDOR };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  const vendor = await User.findOne(query);
  if (!vendor) {
    throw new NotFoundError('Vendor');
  }

  // PENDING is set at signup only; manual transitions are disallowed.
  if (vendorStatus === VENDOR_STATUS.PENDING) {
    throw new ValidationError('Cannot manually set vendor status to pending');
  }

  const previousVendorStatus = vendor.profile?.vendorData?.vendorStatus;

  vendor.profile = vendor.profile || {};
  vendor.profile.vendorData = vendor.profile.vendorData || {};
  vendor.profile.vendorData.vendorStatus = vendorStatus;

  if (vendorStatus === VENDOR_STATUS.APPROVED) {
    vendor.status = USER_STATUS.ACTIVE;
    vendor.profile.vendorData.approvedAt = new Date();
  } else if (vendorStatus === VENDOR_STATUS.REJECTED) {
    vendor.status = USER_STATUS.INACTIVE;
    vendor.profile.vendorData.rejectedAt = new Date();
  } else if (vendorStatus === VENDOR_STATUS.SUSPENDED) {
    vendor.status = USER_STATUS.SUSPENDED;
  }

  await vendor.save();

  logAudit({
    action: 'vendor.status_updated',
    actor: { _id: actorId },
    targetType: 'user',
    targetId: vendorId,
    metadata: { previousVendorStatus, newVendorStatus: vendorStatus },
  }).catch(() => {});

  // Notify vendor of approval status change (non-blocking)
  const isApproved = vendorStatus === VENDOR_STATUS.APPROVED;
  const isRejected = vendorStatus === VENDOR_STATUS.REJECTED;
  if (isApproved || isRejected) {
    notificationService.sendToUser(vendor._id, {
      type: isApproved ? 'vendor_approved' : 'vendor_rejected',
      title: isApproved ? 'Account Approved' : 'Account Rejected',
      titleAr: isApproved ? 'تمت الموافقة على الحساب' : 'تم رفض الحساب',
      message: isApproved
        ? 'Congratulations! Your vendor account has been approved. You can now list your services.'
        : 'Unfortunately, your vendor account application has been rejected. Please contact support.',
      messageAr: isApproved
        ? 'تهانينا! تمت الموافقة على حساب التاجر الخاص بك. يمكنك الآن إضافة خدماتك.'
        : 'للأسف، تم رفض طلب حساب التاجر الخاص بك. يرجى التواصل مع الدعم.',
      data: { entityType: 'user', entityId: vendor._id, metadata: { vendorStatus } },
      priority: 'high',
    }).catch((err) => logger.error('admin.service notify failed', err));

    // email ensures vendor is notified even when push delivery fails
    if (isApproved && vendor.email) {
      const frontendUrl = config.frontendUrl || process.env.FRONTEND_URL || '';
      email.send.vendorApproval(vendor.email, {
        vendorName: vendor.profile?.vendorData?.brandName || vendor.name,
        ownerName: vendor.profile?.vendorData?.ownerFullName || vendor.name,
        status: vendorStatus,
        dashboardUrl: `${frontendUrl}/ar/vendor-dashboard`,
      }).catch((err) => logger.error('admin.updateVendorStatus approval email failed', err));
    }
  } else if (vendorStatus === VENDOR_STATUS.SUSPENDED) {
    notificationService.sendToUser(vendor._id, {
      type: 'account_status_change',
      title: 'Account Suspended',
      titleAr: 'تم تعليق الحساب',
      message: 'Your vendor account has been suspended. Please contact support for more information.',
      messageAr: 'تم تعليق حساب التاجر الخاص بك. يرجى التواصل مع الدعم للمزيد من المعلومات.',
      data: { entityType: 'user', entityId: vendor._id, metadata: { vendorStatus } },
      priority: 'high',
    }).catch((err) => logger.error('admin.service notify failed', err));
  }

  return formatUserResponse(vendor);
}

/**
 * Update vendor rating
 */
async function updateVendorRating(vendorId, rating, comment, whitelabelId) {
  const query = { _id: vendorId, role: ROLES.VENDOR };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  if (rating < 0 || rating > 5) {
    throw new ValidationError('Rating must be between 0 and 5');
  }

  const vendor = await User.findOne(query);
  if (!vendor) {
    throw new NotFoundError('Vendor');
  }

  vendor.profile = vendor.profile || {};
  vendor.profile.vendorData = vendor.profile.vendorData || {};
  vendor.profile.vendorData.rating = rating;
  if (comment !== undefined && comment !== null) {
    vendor.profile.vendorData.ratingComment = comment;
  }

  await vendor.save();

  return { success: true, rating, comment };
}

/**
 * Delete vendor
 */
async function deleteVendor(vendorId, whitelabelId) {
  const query = { _id: vendorId, role: ROLES.VENDOR };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  const vendor = await User.findOne(query);
  if (!vendor) {
    throw new NotFoundError('Vendor');
  }

  vendor.status = USER_STATUS.DELETED;
  vendor.deletedAt = new Date();
  await vendor.save();

  return { success: true, message: 'Vendor deleted successfully' };
}

/**
 * Bulk delete vendors
 */
async function bulkDeleteVendors(vendorIds, whitelabelId) {
  const query = {
    _id: { $in: vendorIds },
    role: ROLES.VENDOR,
  };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  const result = await User.updateMany(
    query,
    {
      status: USER_STATUS.DELETED,
      deletedAt: new Date(),
    }
  );

  return {
    success: true,
    deleted: result.modifiedCount,
    message: `${result.modifiedCount} vendor(s) deleted successfully`,
  };
}

/**
 * Bulk update vendor status
 */
async function bulkUpdateVendorStatus(vendorIds, vendorStatus, whitelabelId) {
  const query = {
    _id: { $in: vendorIds },
    role: ROLES.VENDOR,
  };
  if (whitelabelId !== undefined) {
    query.whitelabelId = whitelabelId;
  }

  const updateData = {
    'profile.vendorData.vendorStatus': vendorStatus,
  };

  if (vendorStatus === VENDOR_STATUS.APPROVED) {
    updateData.status = USER_STATUS.ACTIVE;
    updateData['profile.vendorData.approvedAt'] = new Date();
  } else if (vendorStatus === VENDOR_STATUS.REJECTED) {
    updateData.status = USER_STATUS.INACTIVE;
  } else if (vendorStatus === VENDOR_STATUS.SUSPENDED) {
    updateData.status = USER_STATUS.SUSPENDED;
  }

  const result = await User.updateMany(query, updateData);

  return {
    success: true,
    updated: result.modifiedCount,
    message: `${result.modifiedCount} vendor(s) updated successfully`,
  };
}

/**
 * Export vendors
 */
async function exportVendors(whitelabelId, { search, status, category, from, to } = {}) {
  let query = { role: ROLES.VENDOR };
  if (whitelabelId !== undefined) query.whitelabelId = whitelabelId;
  if (search) {
    const searchQuery = buildSearchQuery(search, ['name', 'email', 'phoneNumber', 'profile.vendorData.brandName']);
    query = { ...query, ...searchQuery };
  }
  if (status) query['profile.vendorData.vendorStatus'] = status;
  if (category) query['profile.vendorData.serviceCategories'] = category;
  const dateRange = buildDateRangeQuery(from, to);
  if (Object.keys(dateRange).length > 0) query.createdAt = dateRange;

  const vendors = await User.find(query)
    .select('username name email phoneNumber status profile.vendorData createdAt')
    .sort({ createdAt: -1 })
    .lean();

  return vendors.map(v => ({
    Name: v.profile?.vendorData?.brandName || v.name || v.username || '-',
    Email: v.email || '-',
    Phone: v.phoneNumber || '-',
    Category: (v.profile?.vendorData?.serviceCategories || []).join(', ') || '-',
    Status: v.profile?.vendorData?.vendorStatus || v.status || '-',
    Rating: v.profile?.vendorData?.rating ?? '-',
    'Created At': v.createdAt ? new Date(v.createdAt).toISOString().split('T')[0] : '-',
  }));
}

module.exports = {
  getVendors,
  getVendorById,
  updateVendorStatus,
  updateVendorRating,
  deleteVendor,
  bulkDeleteVendors,
  bulkUpdateVendorStatus,
  exportVendors,
};
