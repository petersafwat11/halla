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
async function getVendors({ page = 1, limit = 10, search, status, category, from, to }) {
  const skip = (page - 1) * limit;

  let query = { role: ROLES.VENDOR };

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

  const baseQuery = { role: ROLES.VENDOR };
  if (search) {
    const searchQuery = buildSearchQuery(search, [
      'name',
      'email',
      'phoneNumber',
      'profile.vendorData.brandName',
    ]);
    Object.assign(baseQuery, searchQuery);
  }
  if (category) {
    baseQuery['profile.vendorData.serviceCategories'] = category;
  }
  if (Object.keys(dateRange).length > 0) {
    baseQuery.createdAt = dateRange;
  }

  const [vendors, total, statusAgg] = await Promise.all([
    User.find(query)
      .select('-password -passwordResetToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
    User.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$profile.vendorData.vendorStatus', count: { $sum: 1 } } },
    ]),
  ]);

  const counts = {};
  statusAgg.forEach((s) => {
    if (s._id) counts[s._id] = s.count;
  });

  return {
    vendors: vendors.map(v => formatUserResponse(v)),
    statusCounts: {
      approved: counts.approved || 0,
      pending: counts.pending || 0,
      rejected: counts.rejected || 0,
      suspended: counts.suspended || 0,
      ...counts,
    },
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
async function getVendorById(vendorId) {
  const query = { _id: vendorId, role: ROLES.VENDOR };

  const vendor = await User.findOne(query)
    .select('-password -passwordResetToken')
    .lean();

  if (!vendor) {
    throw new NotFoundError('Vendor');
  }

  const { signStoredImage, signStoredImages } = require('../../shared/utils/s3Upload');
  const vd = vendor.profile?.vendorData || {};
  const signedVendorData = {
    ...vd,
    businessLogo: await signStoredImage(vd.businessLogo),
    nationalIdImage: await signStoredImage(vd.nationalIdImage),
    commercialRecordImage: await signStoredImage(vd.commercialRecordImage),
    profileFile: await signStoredImage(vd.profileFile),
    cv: await signStoredImage(vd.cv),
    portfolioImages: await signStoredImages(vd.portfolioImages),
    pricePackages: await signStoredImages(vd.pricePackages),
  };

  return {
    ...formatUserResponse(vendor),
    avatar: await signStoredImage(vendor.avatar),
    vendorData: signedVendorData,
  };
}

/**
 * Update vendor status (approve/reject/suspend)
 */
async function updateVendorStatus(vendorId, vendorStatus, actorId = null) {
  const query = { _id: vendorId, role: ROLES.VENDOR };

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

    // Email always fires for approve/reject — both are admin-driven outcomes
    // the vendor needs to receive regardless of in-app delivery, and they
    // intentionally bypass the (removed) vendor notification preferences.
    if (vendor.email) {
      const frontendUrl = config.frontendUrl || process.env.FRONTEND_URL || '';
      const brandName = vendor.profile?.vendorData?.brandName || vendor.name;
      const ownerName = vendor.profile?.vendorData?.ownerFullName || vendor.name;
      if (isApproved) {
        email.send.vendorApproval(vendor.email, {
          vendorName: ownerName,
          brandName,
          status: vendorStatus,
          dashboardUrl: `${frontendUrl}/ar/vendor-dashboard`,
        }).catch((err) => logger.error('admin.updateVendorStatus approval email failed', err));
      } else {
        email.send.vendorRejection(vendor.email, {
          vendorName: ownerName,
          brandName,
          status: vendorStatus,
          reapplyUrl: `${frontendUrl}/ar/vendor-onboarding`,
          supportEmail: config.supportEmail || process.env.SUPPORT_EMAIL || '',
        }).catch((err) => logger.error('admin.updateVendorStatus rejection email failed', err));
      }
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
async function updateVendorRating(vendorId, rating, comment) {
  const query = { _id: vendorId, role: ROLES.VENDOR };

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
async function deleteVendor(vendorId) {
  const query = { _id: vendorId, role: ROLES.VENDOR };

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
async function bulkDeleteVendors(vendorIds) {
  const query = {
    _id: { $in: vendorIds },
    role: ROLES.VENDOR,
  };

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
async function bulkUpdateVendorStatus(vendorIds, vendorStatus) {
  const query = {
    _id: { $in: vendorIds },
    role: ROLES.VENDOR,
  };

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
async function exportVendors({ search, status, category, from, to } = {}) {
  let query = { role: ROLES.VENDOR };
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
