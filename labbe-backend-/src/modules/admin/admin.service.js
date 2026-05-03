/**
 * Admin Service
 * Business logic for admin management operations
 * @module modules/admin/admin.service
 */

const User = require('../../../models/UserModel');
const Event = require('../../../models/EventModel');
const Subscription = require('../../../models/SubscriptionModel');
const Plan = require('../../../models/PlanModel');
const Guest = require('../../../models/GuestModel');
const { NotFoundError, ValidationError, ConflictError } = require('../../shared/errors');
const { ROLES, WHITELABEL_ROLES, USER_STATUS, EVENT_STATUS, SUBSCRIPTION_STATUS, VENDOR_STATUS } = require('../../shared/constants');
const mongoose = require('mongoose');
const notificationService = require('../notifications/notifications.service');
const config = require('../../config');
const email = require('../../../email');
const { logAudit } = require('../../shared/utils/auditLog');

class AdminService {
  /**
   * Build search query for users
   * @private
   */
  _buildSearchQuery(searchValue, fields) {
    if (!searchValue) return {};
    const escaped = searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = { $regex: escaped, $options: 'i' };
    return {
      $or: fields.map(field => ({ [field]: searchRegex })),
    };
  }

  /**
   * Build date range query
   * @private
   */
  _buildDateRangeQuery(from, to) {
    if (!from && !to) return {};
    const query = {};
    if (from) query.$gte = new Date(from);
    if (to) query.$lte = new Date(to);
    return query;
  }

  /**
   * Format user response
   * @private
   */
  _formatUserResponse(user) {
    const base = {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      profileCompleted: user.profile?.hostData?.profileCompleted || user.profile?.vendorData?.profileCompleted,
      emailVerified: user.profile?.hostData?.emailVerified || user.emailVerified || false,
      subscription: user.subscription ? {
        planType: user.subscription.planId?.planType || user.subscription.planType,
        planId: user.subscription.planId,
        status: user.subscription.status,
        currentPeriodEnd: user.subscription.endDate || user.subscription.currentPeriodEnd,
        billingCycle: user.subscription.billingCycle,
        limits: {
          maxEvents: user.subscription.planId?.limits?.maxEventsPerMonth ?? null,
          maxGuestsPerEvent: user.subscription.planId?.limits?.maxGuestsPerEvent ?? null,
        },
      } : null,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };

    // Vendor-specific fields
    if (user.role === ROLES.VENDOR) {
      const vd = user.profile?.vendorData;
      base.brandName = vd?.brandName || null;
      base.vendorStatus = vd?.vendorStatus || null;
      base.rating = vd?.rating ?? null;
      base.serviceCategories = vd?.serviceCategories || null;
    }

    return base;
  }

  // ============================================
  // HOST MANAGEMENT
  // ============================================

  /**
   * Get all hosts with pagination and filters
   */
  async getHosts({ page = 1, limit = 10, search, status, from, to, whitelabelId }) {
    const skip = (page - 1) * limit;

    let query = { role: ROLES.HOST };

    // Whitelabel filter
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    // Search filter
    if (search) {
      const searchQuery = this._buildSearchQuery(search, ['username', 'name', 'email', 'phoneNumber']);
      query = { ...query, ...searchQuery };
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Date range filter
    const dateRange = this._buildDateRangeQuery(from, to);
    if (Object.keys(dateRange).length > 0) {
      query.createdAt = dateRange;
    }

    const baseQuery = { role: ROLES.HOST };
    if (whitelabelId !== undefined) baseQuery.whitelabelId = whitelabelId;

    const [hosts, total, statusCounts] = await Promise.all([
      User.find(query)
        .select('-password -passwordResetToken -__v')
        .populate({
          path: 'subscription',
          select: 'status endDate planId billingCycle',
          populate: { path: 'planId', select: 'features limits name nameAr nameEn code planType' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
      User.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const counts = {};
    statusCounts.forEach(s => { counts[s._id] = s.count; });

    return {
      hosts: hosts.map(h => this._formatUserResponse(h)),
      statusCounts: {
        active: counts.active || 0,
        pending: counts.pending || 0,
        suspended: counts.suspended || 0,
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
   * Get host by ID
   */
  async getHostById(hostId, whitelabelId) {
    const query = { _id: hostId, role: ROLES.HOST };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    const host = await User.findOne(query)
      .select('-password -passwordResetToken')
      .populate({
        path: 'subscription',
        select: 'status endDate planId billingCycle',
        populate: { path: 'planId', select: 'features limits name nameAr nameEn code planType' },
      })
      .lean();

    if (!host) {
      throw new NotFoundError('Host');
    }

    // Get host events and statistics
    const [events, eventCount, activeEvents] = await Promise.all([
      Event.find({ host: hostId })
        .select('eventDetails status guestList')
        .sort({ createdAt: -1 })
        .lean(),
      Event.countDocuments({ host: hostId }),
      Event.countDocuments({ host: hostId, status: EVENT_STATUS.PUBLISHED }),
    ]);

    // Get RSVP counts per event
    const eventIds = events.map(e => e._id);
    const rsvpCounts = eventIds.length > 0
      ? await Guest.aggregate([
        { $match: { event: { $in: eventIds } } },
        { $group: { _id: { event: '$event', status: '$status' }, count: { $sum: 1 } } },
      ])
      : [];

    const rsvpMap = {};
    rsvpCounts.forEach(r => {
      const eid = r._id.event.toString();
      if (!rsvpMap[eid]) rsvpMap[eid] = {};
      rsvpMap[eid][r._id.status] = r.count;
    });

    const formattedEvents = events.map(e => {
      const counts = rsvpMap[e._id.toString()] || {};
      return {
        id: e._id,
        title: e.eventDetails?.title || e.eventDetails?.eventName,
        date: e.eventDetails?.date,
        time: e.eventDetails?.time,
        location: e.eventDetails?.location,
        status: e.status,
        guestListLength: e.guestList?.length || 0,
        totalConfirmed: counts.confirmed || 0,
        totalDeclined: counts.declined || 0,
        totalPending: (counts.invited || 0) + (counts.maybe || 0),
      };
    });

    return {
      ...this._formatUserResponse(host),
      events: formattedEvents,
      statistics: {
        totalEvents: eventCount,
        activeEvents,
      },
    };
  }

  /**
   * Create new host
   */
  async createHost({ email, phoneNumber, name, username, password, whitelabelId }) {
    // Check for duplicates
    const existingUser = await User.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { phoneNumber },
      ],
    });

    if (existingUser) {
      if (existingUser.email === email?.toLowerCase()) {
        throw new ConflictError('Email already exists', 'email');
      }
      if (existingUser.phoneNumber === phoneNumber) {
        throw new ConflictError('Phone number already exists', 'phoneNumber');
      }
    }

    // Create host
    const host = await User.create({
      email: email?.toLowerCase(),
      phoneNumber,
      name,
      username: username || `host_${Date.now()}`,
      password,
      role: ROLES.HOST,
      status: USER_STATUS.ACTIVE,
      whitelabelId: whitelabelId || null,
      profile: {
        hostData: {
          profileCompleted: true,
          emailVerified: false,
        },
      },
    });

    // Create trial subscription and link to user
    const trialPlan = await Plan.findOne({ code: 'trial' });
    if (trialPlan) {
      const subscription = await Subscription.create({
        userId: host._id,
        planId: trialPlan._id,
        planType: 'trial',
        status: 'trial',
        startDate: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
      await User.findByIdAndUpdate(host._id, { subscription: subscription._id });
    }

    // Welcome notification to new host (non-blocking)
    notificationService.sendToUser(host._id, {
      type: 'welcome',
      title: 'Welcome to Labbe!',
      titleAr: 'مرحباً بك في لبّي!',
      message: 'Your host account has been created successfully. Start creating events!',
      messageAr: 'تم إنشاء حساب المضيف بنجاح. ابدأ في إنشاء المناسبات!',
      data: { entityType: 'user', entityId: host._id },
    }).catch(console.error);

    return this._formatUserResponse(host);
  }

  /**
   * Update host status
   */
  async updateHostStatus(hostId, status, whitelabelId) {
    const query = { _id: hostId, role: ROLES.HOST };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    const host = await User.findOneAndUpdate(
      query,
      { status },
      { new: true, runValidators: true }
    );

    if (!host) {
      throw new NotFoundError('Host');
    }

    // Notify host of status change (non-blocking)
    notificationService.sendToUser(host._id, {
      type: 'account_status_change',
      title: 'Account Status Updated',
      titleAr: 'تم تحديث حالة الحساب',
      message: `Your account status has been updated to ${status}.`,
      messageAr: `تم تحديث حالة حسابك إلى ${status}.`,
      data: { entityType: 'user', entityId: host._id, metadata: { status } },
    }).catch(console.error);

    return this._formatUserResponse(host);
  }

  /**
   * Update host subscription
   */
  async updateHostSubscription(hostId, { planCode, status: subscriptionStatus, billingCycle }, whitelabelId) {
    const query = { _id: hostId, role: ROLES.HOST };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    const host = await User.findOne(query);
    if (!host) {
      throw new NotFoundError('Host');
    }

    const plan = await Plan.findOne({ code: planCode });
    if (!plan) {
      throw new NotFoundError('Plan');
    }

    // H-10: previous code used `findOne({ userId })` with no status filter
    // and no sort — would return cancelled subs at random. Use the
    // canonical helper for the active-or-trial sub.
    const activeSubs = await Subscription.findActiveForUser(hostId);
    const subscription = activeSubs[0] || null;

    // Validate and use fallback billing cycle
    const finalBillingCycle = billingCycle || (plan.planType === 'single_event' ? 'once' : 'monthly');

    if (!subscription) {
      // Create new subscription and link to user
      const newSub = await Subscription.create({
        userId: hostId,
        planId: plan._id,
        status: subscriptionStatus || SUBSCRIPTION_STATUS.ACTIVE,
        billingCycle: finalBillingCycle,
        startDate: new Date(),
        // endDate is automatically computed by Subscription model pre-save hook based on billingCycle if not passed!
      });
      await User.findByIdAndUpdate(hostId, { subscription: newSub._id });
    } else {
      // Update existing subscription
      subscription.planId = plan._id;
      if (subscriptionStatus) {
        subscription.status = subscriptionStatus;
      }
      subscription.billingCycle = finalBillingCycle;

      // Also reset end date based on new billing cycle
      const start = subscription.startDate || new Date();
      if (finalBillingCycle === 'yearly') {
        const end = new Date(start);
        end.setMonth(end.getMonth() + 12);
        subscription.endDate = end;
      } else if (finalBillingCycle === 'monthly') {
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        subscription.endDate = end;
      } else {
        subscription.endDate = null;
      }

      await subscription.save();
    }

    // Notify host of subscription update (non-blocking)
    notificationService.sendToUser(hostId, {
      type: 'subscription_updated',
      title: 'Subscription Updated',
      titleAr: 'تم تحديث الاشتراك',
      message: `Your subscription has been updated to the ${planCode} plan.`,
      messageAr: `تم تحديث اشتراكك إلى باقة ${planCode}.`,
      data: { entityType: 'subscription', metadata: { planCode } },
    }).catch(console.error);

    return { success: true, message: 'Subscription updated successfully' };
  }

  /**
   * Delete host
   */
  async deleteHost(hostId, whitelabelId) {
    const query = { _id: hostId, role: ROLES.HOST };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    const host = await User.findOne(query);
    if (!host) {
      throw new NotFoundError('Host');
    }

    // Check if host has active events
    const activeEvents = await Event.countDocuments({ host: hostId, status: EVENT_STATUS.PUBLISHED });
    if (activeEvents > 0) {
      throw new ValidationError('Cannot delete host with active events');
    }

    // Soft delete
    host.status = USER_STATUS.DELETED;
    host.deletedAt = new Date();
    await host.save();

    return { success: true, message: 'Host deleted successfully' };
  }

  /**
   * Bulk delete hosts
   */
  async bulkDeleteHosts(hostIds, whitelabelId) {
    const query = {
      _id: { $in: hostIds },
      role: ROLES.HOST,
    };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    // Check for active events
    const hostsWithActiveEvents = await Event.distinct('host', {
      host: { $in: hostIds },
      status: EVENT_STATUS.PUBLISHED,
    });

    if (hostsWithActiveEvents.length > 0) {
      throw new ValidationError(`Cannot delete ${hostsWithActiveEvents.length} host(s) with active events`);
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
      message: `${result.modifiedCount} host(s) deleted successfully`,
    };
  }

  /**
   * Verify host by phone number
   */
  async verifyHostByPhone(phoneNumber, whitelabelId) {
    const query = { phoneNumber, role: ROLES.HOST };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    const host = await User.findOne(query).select('_id username name email phoneNumber status').lean();

    return {
      exists: !!host,
      host: host ? this._formatUserResponse(host) : null,
    };
  }

  /**
   * Find or create host
   */
  async findOrCreateHost({ phoneNumber, name, email, whitelabelId }) {
    const query = { phoneNumber, role: ROLES.HOST };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    let host = await User.findOne(query);

    if (host) {
      return {
        host: this._formatUserResponse(host),
        created: false,
      };
    }

    // Create new host
    host = await this.createHost({
      phoneNumber,
      name,
      email,
      username: `host_${Date.now()}`,
      password: require('crypto').randomBytes(16).toString('hex'), // Secure random password
      whitelabelId,
    });

    return {
      host,
      created: true,
    };
  }

  // ============================================
  // VENDOR MANAGEMENT
  // ============================================

  /**
   * Get all vendors with pagination and filters
   */
  async getVendors({ page = 1, limit = 10, search, status, category, from, to, whitelabelId }) {
    const skip = (page - 1) * limit;

    let query = { role: ROLES.VENDOR };

    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    if (search) {
      const searchQuery = this._buildSearchQuery(search, [
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

    const dateRange = this._buildDateRangeQuery(from, to);
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
      vendors: vendors.map(v => this._formatUserResponse(v)),
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
  async getVendorById(vendorId, whitelabelId) {
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
      ...this._formatUserResponse(vendor),
      vendorData: vendor.profile?.vendorData || {},
    };
  }

  /**
   * Update vendor status (approve/reject/suspend)
   */
  async updateVendorStatus(vendorId, vendorStatus, whitelabelId) {
    const query = { _id: vendorId, role: ROLES.VENDOR };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    const vendor = await User.findOne(query);
    if (!vendor) {
      throw new NotFoundError('Vendor');
    }

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
      }).catch(console.error);
    } else if (vendorStatus === VENDOR_STATUS.SUSPENDED) {
      notificationService.sendToUser(vendor._id, {
        type: 'account_status_change',
        title: 'Account Suspended',
        titleAr: 'تم تعليق الحساب',
        message: 'Your vendor account has been suspended. Please contact support for more information.',
        messageAr: 'تم تعليق حساب التاجر الخاص بك. يرجى التواصل مع الدعم للمزيد من المعلومات.',
        data: { entityType: 'user', entityId: vendor._id, metadata: { vendorStatus } },
        priority: 'high',
      }).catch(console.error);
    }

    return this._formatUserResponse(vendor);
  }

  /**
   * Update vendor rating
   */
  async updateVendorRating(vendorId, rating, whitelabelId) {
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

    await vendor.save();

    return { success: true, rating };
  }

  /**
   * Delete vendor
   */
  async deleteVendor(vendorId, whitelabelId) {
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
  async bulkDeleteVendors(vendorIds, whitelabelId) {
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
  async bulkUpdateVendorStatus(vendorIds, vendorStatus, whitelabelId) {
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

  // ============================================
  // MODERATOR MANAGEMENT
  // ============================================

  /**
   * Get all moderators with pagination and filters
   */
  async getModerators({ page = 1, limit = 10, search, status, from, to, whitelabelId }) {
    const skip = (page - 1) * limit;

    // Tenant-isolated query:
    // - Whitelabel users see only their own whitelabel_moderators/whitelabel_admins
    // - Platform users (super_admin, admin, moderator — all have whitelabelId: null)
    //   see only platform moderators/admins (no whitelabelId)
    let query = {};
    if (whitelabelId !== undefined && whitelabelId !== null) {
      // Whitelabel user — only their whitelabel_moderators and whitelabel_admins
      query = { role: { $in: [ROLES.WHITELABEL_MODERATOR, ROLES.WHITELABEL_ADMIN] }, whitelabelId };
    } else if (whitelabelId === null) {
      // Platform admin/super_admin — only platform moderators and admins
      query = { role: { $in: [ROLES.MODERATOR, ROLES.ADMIN] }, whitelabelId: null };
    } else {
      // Fallback (whitelabelId === undefined): safety net, should not occur after middleware fix
      query = { role: { $in: [ROLES.MODERATOR, ROLES.ADMIN] }, whitelabelId: null };
    }

    if (search) {
      const searchQuery = this._buildSearchQuery(search, ['username', 'name', 'email', 'phoneNumber']);
      query = { ...query, ...searchQuery };
    }

    if (status) {
      query.status = status;
    }

    const dateRange = this._buildDateRangeQuery(from, to);
    if (Object.keys(dateRange).length > 0) {
      query.createdAt = dateRange;
    }

    const [moderators, total] = await Promise.all([
      User.find(query)
        .select('-password -passwordResetToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return {
      moderators: moderators.map(m => this._formatUserResponse(m)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create new moderator
   */
  async createModerator({ email, phoneNumber, name, username, password, permissions, whitelabelId, role: requestedRole }) {
    const existingUser = await User.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { phoneNumber },
      ],
    });

    if (existingUser) {
      if (existingUser.email === email?.toLowerCase()) {
        throw new ConflictError('Email already exists', 'email');
      }
      if (existingUser.phoneNumber === phoneNumber) {
        throw new ConflictError('Phone number already exists', 'phoneNumber');
      }
    }

    // TENANT-F01: every admin / moderator / whitelabel-admin / whitelabel-moderator
    // must be tenant-scoped via a non-null whitelabelId. SUPER_ADMIN is the only
    // role allowed to be cross-tenant; we never create it from this endpoint.
    if (!whitelabelId) {
      throw new ValidationError(
        'whitelabelId is required when creating an admin or moderator user'
      );
    }

    // Determine the correct role. Both branches require a whitelabelId.
    // - Whitelabel-creator path (called by WHITELABEL_ADMIN): whitelabel-only roles.
    // - Platform-creator path (called by SUPER_ADMIN): platform-admin roles, but
    //   still tenant-bound via the supplied whitelabelId.
    const WHITELABEL_ALLOWED = [ROLES.WHITELABEL_MODERATOR, ROLES.WHITELABEL_ADMIN];
    const PLATFORM_ALLOWED = [ROLES.MODERATOR, ROLES.ADMIN];

    let moderatorRole;
    if (WHITELABEL_ALLOWED.includes(requestedRole)) {
      moderatorRole = requestedRole;
    } else if (PLATFORM_ALLOWED.includes(requestedRole)) {
      moderatorRole = requestedRole;
    } else {
      moderatorRole = ROLES.MODERATOR;
    }

    const moderator = await User.create({
      email: email?.toLowerCase(),
      phoneNumber,
      name,
      username: username || `moderator_${Date.now()}`,
      password,
      role: moderatorRole,
      status: USER_STATUS.ACTIVE,
      whitelabelId,
      ...(Array.isArray(permissions) && permissions.length > 0 ? { permissions } : {}),
    });

    // Welcome notification to new moderator (non-blocking)
    notificationService.sendToUser(moderator._id, {
      type: 'welcome',
      title: 'Welcome to Labbe!',
      titleAr: 'مرحباً بك في لبّي!',
      message: `Your moderator account has been created. You now have access to the admin dashboard.`,
      messageAr: 'تم إنشاء حساب المشرف الخاص بك. يمكنك الآن الوصول إلى لوحة التحكم.',
      data: { entityType: 'user', entityId: moderator._id },
    }).catch(console.error);

    return this._formatUserResponse(moderator);
  }

  /**
   * Update moderator
   */
  async updateModerator(moderatorId, updateData, whitelabelId) {
    const query = { _id: moderatorId, role: { $in: [ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN] } };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    const allowedUpdates = ['name', 'email', 'phoneNumber', 'permissions', 'role'];
    const updates = {};

    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    // Validate role change if requested
    if (updates.role) {
      const WHITELABEL_ALLOWED = [ROLES.WHITELABEL_MODERATOR, ROLES.WHITELABEL_ADMIN];
      const PLATFORM_ALLOWED = [ROLES.MODERATOR, ROLES.ADMIN];
      if (whitelabelId !== undefined && whitelabelId !== null) {
        if (!WHITELABEL_ALLOWED.includes(updates.role)) delete updates.role;
      } else {
        if (!PLATFORM_ALLOWED.includes(updates.role)) delete updates.role;
      }
    }

    if (updates.email) {
      updates.email = updates.email.toLowerCase();
    }

    const moderator = await User.findOneAndUpdate(
      query,
      updates,
      { new: true, runValidators: true }
    );

    if (!moderator) {
      throw new NotFoundError('Moderator');
    }

    return this._formatUserResponse(moderator);
  }

  /**
   * Update moderator status
   */
  async updateModeratorStatus(moderatorId, status, whitelabelId) {
    const query = { _id: moderatorId, role: { $in: [ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN] } };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    const moderator = await User.findOneAndUpdate(
      query,
      { status },
      { new: true, runValidators: true }
    );

    if (!moderator) {
      throw new NotFoundError('Moderator');
    }

    // Notify moderator of status change (non-blocking)
    notificationService.sendToUser(moderator._id, {
      type: 'account_status_change',
      title: 'Account Status Updated',
      titleAr: 'تم تحديث حالة الحساب',
      message: `Your account status has been updated to ${status}.`,
      messageAr: `تم تحديث حالة حسابك إلى ${status}.`,
      data: { entityType: 'user', entityId: moderator._id, metadata: { status } },
    }).catch(console.error);

    return this._formatUserResponse(moderator);
  }

  /**
   * Delete moderator
   */
  async deleteModerator(moderatorId, whitelabelId) {
    const query = { _id: moderatorId, role: { $in: [ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN] } };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    const moderator = await User.findOne(query);
    if (!moderator) {
      throw new NotFoundError('Moderator');
    }

    moderator.status = USER_STATUS.DELETED;
    moderator.deletedAt = new Date();
    await moderator.save();

    return { success: true, message: 'Moderator deleted successfully' };
  }

  /**
   * Bulk delete moderators
   */
  async bulkDeleteModerators(moderatorIds, whitelabelId) {
    const query = {
      _id: { $in: moderatorIds },
      role: { $in: [ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN] },
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
      message: `${result.modifiedCount} moderator(s) deleted successfully`,
    };
  }

  /**
   * Bulk update moderator status
   */
  async bulkUpdateModeratorStatus(moderatorIds, status, whitelabelId) {
    const query = { _id: { $in: moderatorIds } };

    if (whitelabelId !== undefined && whitelabelId !== null) {
      // Whitelabel user — only their whitelabel moderators
      query.role = { $in: [ROLES.WHITELABEL_MODERATOR, ROLES.WHITELABEL_ADMIN] };
      query.whitelabelId = whitelabelId;
    } else if (whitelabelId === null) {
      // Platform admin/super_admin — only platform moderators (no whitelabelId)
      query.role = { $in: [ROLES.MODERATOR, ROLES.ADMIN] };
      query.whitelabelId = null;
    } else {
      // No filter set (should not happen after middleware fix, kept as safety net)
      query.role = { $in: [ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN] };
    }

    const result = await User.updateMany(query, { status });

    return {
      success: true,
      updated: result.modifiedCount,
      message: `${result.modifiedCount} moderator(s) updated to ${status}`,
    };
  }

  // ============================================
  // WHITELABEL MANAGEMENT
  // ============================================

  /**
   * Get all whitelabels with pagination and filters
   */
  async getWhitelabels({ page = 1, limit = 10, search, status, from, to }) {
    const skip = (page - 1) * limit;

    let query = { role: ROLES.WHITELABEL_ADMIN };

    if (search) {
      const searchQuery = this._buildSearchQuery(search, ['username', 'name', 'email', 'phoneNumber']);
      query = { ...query, ...searchQuery };
    }

    if (status) {
      query.status = status;
    }

    const dateRange = this._buildDateRangeQuery(from, to);
    if (Object.keys(dateRange).length > 0) {
      query.createdAt = dateRange;
    }

    const [whitelabels, total] = await Promise.all([
      User.find(query)
        .select('-password -passwordResetToken')
        .populate('subscription', 'planType status currentPeriodEnd')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    const whitelabelsWithStats = await Promise.all(
      whitelabels.map(async (wl) => {
        const hostCount = await User.countDocuments({
          whitelabelId: wl._id,
          role: ROLES.HOST,
        });

        return {
          ...this._formatUserResponse(wl),
          hostCount,
        };
      })
    );

    return {
      whitelabels: whitelabelsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get whitelabel by ID
   */
  async getWhitelabelById(whitelabelId) {
    const whitelabel = await User.findOne({
      _id: whitelabelId,
      role: ROLES.WHITELABEL_ADMIN,
    })
      .select('-password -passwordResetToken')
      .populate('subscription')
      .lean();

    if (!whitelabel) {
      throw new NotFoundError('Whitelabel');
    }

    const [hostCount, eventCount] = await Promise.all([
      User.countDocuments({ whitelabelId, role: ROLES.HOST }),
      Event.countDocuments({ whitelabelId }),
    ]);

    return {
      ...this._formatUserResponse(whitelabel),
      statistics: {
        totalHosts: hostCount,
        totalEvents: eventCount,
      },
    };
  }

  /**
   * Update whitelabel status.
   *
   * Phase 4b W0-EMAIL (D5): the Approve action on the admin dashboard now
   * fires this with `{ status: 'active', dispatchSetupEmail: true }`. When
   * BOTH conditions hold (status is `active` AND the caller asks for an
   * email), we mint a fresh password setup token and send the existing
   * `whitelabelApproval` email template — which has a `setupPasswordUrl`
   * slot that's been waiting for an admin-side dispatch since Phase 4.
   *
   * Re-approval (admin clicks Approve again on an already-active row)
   * regenerates the token so the prior link is invalidated.
   *
   * Token + status are saved in two ordered writes (no Mongo transaction
   * — `User` is single-collection and the failure mode is "no email
   * went out", which the audit row will capture). If the email send
   * itself fails we log it loudly and write a `failure` audit entry but
   * keep the new status / token so an admin can re-trigger from the UI.
   *
   * @param {string} whitelabelId
   * @param {string} status - one of USER_STATUS values
   * @param {Object} [opts]
   * @param {boolean} [opts.dispatchSetupEmail=false] — when true and
   *        status is 'active', mint a setup token and send the email.
   * @param {Object} [opts.actor] — req.user (for audit log)
   * @returns {Promise<Object>}
   */
  async updateWhitelabelStatus(whitelabelId, status, opts = {}) {
    const { dispatchSetupEmail = false, actor = null } = opts;

    const whitelabel = await User.findOne({
      _id: whitelabelId,
      role: ROLES.WHITELABEL_ADMIN,
    });

    if (!whitelabel) {
      throw new NotFoundError('Whitelabel');
    }

    const previousStatus = whitelabel.status;
    whitelabel.status = status;

    let setupToken = null;
    if (dispatchSetupEmail && status === USER_STATUS.ACTIVE) {
      // Mint a fresh token. createPasswordSetupToken() hashes onto the
      // user document and returns the plain token; we save below.
      setupToken = whitelabel.createPasswordSetupToken();
    }

    // Single save persists status change + (optional) setup token hash.
    await whitelabel.save({ validateBeforeSave: false });

    // Notify whitelabel of status change (non-blocking, in-app).
    notificationService.sendToUser(whitelabel._id, {
      type: 'account_status_change',
      title: 'Account Status Updated',
      titleAr: 'تم تحديث حالة الحساب',
      message: `Your platform account status has been updated to ${status}.`,
      messageAr: `تم تحديث حالة حساب منصتك إلى ${status}.`,
      data: { entityType: 'user', entityId: whitelabel._id, metadata: { status } },
    }).catch(console.error);

    let emailDispatch = { sent: false, attempted: false };
    if (setupToken) {
      emailDispatch.attempted = true;
      try {
        const frontendUrl = config?.frontend?.url || '';
        const setupPasswordUrl = `${frontendUrl}/ar/setup-password/${setupToken}`;
        await email.send.whitelabelApproval(
          whitelabel.email,
          {
            platformName:
              whitelabel.platformName || whitelabel.username || whitelabel.email,
            email: whitelabel.email,
            setupPasswordUrl,
            dashboardUrl: `${frontendUrl}/ar/whitelabel/dashboard`,
          },
          'ar'
        );
        emailDispatch.sent = true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          `[admin.updateWhitelabelStatus] email send failed for whitelabel ${whitelabelId}:`,
          err?.message || err
        );
        emailDispatch.error = err?.message || String(err);
      }
    }

    // Audit log the status update + email dispatch outcome.
    try {
      await logAudit({
        action: 'whitelabel.status_update',
        actor,
        targetType: 'whitelabel',
        targetId: whitelabel._id,
        whitelabelId: whitelabel._id,
        metadata: {
          previousStatus,
          newStatus: status,
          dispatchSetupEmail,
          emailDispatch,
        },
        status: emailDispatch.attempted && !emailDispatch.sent ? 'partial' : 'success',
      });
    } catch (auditErr) {
      // eslint-disable-next-line no-console
      console.warn('[admin.updateWhitelabelStatus] audit log failed:', auditErr?.message);
    }

    return {
      ...this._formatUserResponse(whitelabel),
      emailDispatch,
    };
  }

  /**
   * Update whitelabel subscription
   */
  async updateWhitelabelSubscription(whitelabelId, { planCode, status: subscriptionStatus }) {
    const whitelabel = await User.findOne({
      _id: whitelabelId,
      role: ROLES.WHITELABEL_ADMIN,
    });

    if (!whitelabel) {
      throw new NotFoundError('Whitelabel');
    }

    const plan = await Plan.findOne({ code: planCode });
    if (!plan) {
      throw new NotFoundError('Plan');
    }

    // H-10: was findOne({userId}) with no filter/sort. Use canonical helper.
    const activeWlSubs = await Subscription.findActiveForUser(whitelabelId);
    const subscription = activeWlSubs[0] || null;

    if (!subscription) {
      const newSub = await Subscription.create({
        userId: whitelabelId,
        planId: plan._id,
        planType: planCode,
        status: subscriptionStatus || SUBSCRIPTION_STATUS.ACTIVE,
        startDate: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
      await User.findByIdAndUpdate(whitelabelId, { subscription: newSub._id });
    } else {
      subscription.planId = plan._id;
      subscription.planType = planCode;
      if (subscriptionStatus) {
        subscription.status = subscriptionStatus;
      }
      await subscription.save();
    }

    // Notify whitelabel of subscription update (non-blocking)
    notificationService.sendToUser(whitelabelId, {
      type: 'subscription_updated',
      title: 'Subscription Updated',
      titleAr: 'تم تحديث الاشتراك',
      message: `Your platform subscription has been updated to the ${planCode} plan.`,
      messageAr: `تم تحديث اشتراك منصتك إلى باقة ${planCode}.`,
      data: { entityType: 'subscription', metadata: { planCode } },
    }).catch(console.error);

    return { success: true, message: 'Subscription updated successfully' };
  }

  /**
   * Delete whitelabel
   */
  async deleteWhitelabel(whitelabelId) {
    const whitelabel = await User.findOne({
      _id: whitelabelId,
      role: ROLES.WHITELABEL_ADMIN,
    });

    if (!whitelabel) {
      throw new NotFoundError('Whitelabel');
    }

    const hostCount = await User.countDocuments({
      whitelabelId,
      role: ROLES.HOST,
    });

    if (hostCount > 0) {
      throw new ValidationError(`Cannot delete whitelabel with ${hostCount} host(s)`);
    }

    whitelabel.status = USER_STATUS.DELETED;
    whitelabel.deletedAt = new Date();
    await whitelabel.save();

    return { success: true, message: 'Whitelabel deleted successfully' };
  }

  /**
   * Bulk delete whitelabels
   */
  async bulkDeleteWhitelabels(whitelabelIds) {
    const hostCount = await User.countDocuments({
      whitelabelId: { $in: whitelabelIds },
      role: ROLES.HOST,
    });

    if (hostCount > 0) {
      throw new ValidationError(`Cannot delete whitelabels with ${hostCount} host(s)`);
    }

    const result = await User.updateMany(
      {
        _id: { $in: whitelabelIds },
        role: ROLES.WHITELABEL_ADMIN,
      },
      {
        status: USER_STATUS.DELETED,
        deletedAt: new Date(),
      }
    );

    return {
      success: true,
      deleted: result.modifiedCount,
      message: `${result.modifiedCount} whitelabel(s) deleted successfully`,
    };
  }

  /**
   * Bulk update whitelabel status (e.g. bulk suspend)
   */
  async bulkUpdateWhitelabelStatus(whitelabelIds, status) {
    const result = await User.updateMany(
      { _id: { $in: whitelabelIds }, role: ROLES.WHITELABEL_ADMIN },
      { status }
    );

    return {
      success: true,
      updated: result.modifiedCount,
      message: `${result.modifiedCount} whitelabel(s) updated to ${status}`,
    };
  }

  // ============================================
  // EVENT MANAGEMENT (ADMIN)
  // ============================================

  /**
   * Get event by ID (admin - with whitelabel filter)
   */
  async getEventById(eventId, whitelabelId = undefined) {
    const query = { _id: eventId };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    const event = await Event.findOne(query)
      .populate('host', 'username email phoneNumber name')
      .populate('guestList', 'name email phone status');

    if (!event) {
      throw new NotFoundError('Event');
    }

    return { event };
  }

  /**
   * Full event update (admin)
   */
  async updateEventFull(eventId, updateData, context = {}) {
    const query = { _id: eventId };
    if (context.whitelabelId !== undefined) {
      query.whitelabelId = context.whitelabelId;
    }

    const event = await Event.findOne(query);
    if (!event) {
      throw new NotFoundError('Event');
    }

    const allowedFields = ['eventDetails', 'invitationSettings', 'staffList'];
    allowedFields.forEach((field) => {
      if (updateData[field]) {
        event[field] = { ...event[field]?.toObject?.() || event[field] || {}, ...updateData[field] };
      }
    });

    // Handle guest list update
    if (updateData.guestList) {
      const Guest = require('../../../models/GuestModel');
      // Remove old guests
      await Guest.deleteMany({ event: eventId });
      // Create new guests
      if (updateData.guestList.length > 0) {
        const docs = updateData.guestList.map(g => ({
          name: g.name,
          phone: g.phone,
          email: g.email,
          event: eventId,
          status: 'invited',
          addedBy: context.adminId,
        }));
        const saved = await Guest.insertMany(docs);
        event.guestList = saved.map(g => g._id);
      } else {
        event.guestList = [];
      }
    }

    // Handle file upload
    if (context.file) {
      const templateImagePath = `/uploads/templates/${context.file.filename}`;
      event.invitationSettings = event.invitationSettings || {};
      event.invitationSettings.templateImage = templateImagePath;
    }

    await event.save();

    // Notify host of event update by admin (non-blocking)
    if (event.host) {
      const eventTitle = event.eventDetails?.title || 'Untitled';
      notificationService.sendToUser(event.host, {
        type: 'event_updated',
        title: 'Event Updated by Admin',
        titleAr: 'تم تحديث المناسبة من قبل المسؤول',
        message: `Your event "${eventTitle}" has been updated by an admin.`,
        messageAr: `تم تحديث مناسبتك "${eventTitle}" من قبل المسؤول.`,
        data: { entityType: 'event', entityId: event._id },
      }).catch(console.error);
    }

    return { event };
  }

  /**
   * Get event targets (hosts or whitelabel_admins with subscription info)
   * Filters by whitelabelId based on requesting user's role:
   * - Whitelabel admins: only see hosts belonging to their whitelabel
   * - Platform admins: see all hosts except whitelabel-owned ones
   * - Super admin: sees everything
   */
  async getEventTargets(type = 'host', requestingUser = null) {
    const role = type === 'whitelabel' ? ROLES.WHITELABEL_ADMIN : ROLES.HOST;

    const query = { role, status: { $ne: USER_STATUS.DELETED } };

    // Apply whitelabel filtering
    if (requestingUser) {
      const isWhitelabelUser = WHITELABEL_ROLES.includes(requestingUser.role);
      const isSuperAdmin = requestingUser.role === ROLES.SUPER_ADMIN;

      if (isWhitelabelUser && requestingUser.whitelabelId) {
        // Whitelabel admin: only hosts that belong to their whitelabel
        query.whitelabelId = requestingUser.whitelabelId;
      } else if (!isSuperAdmin) {
        // Platform admin (admin/moderator): hosts without a whitelabel
        query.whitelabelId = null;
      }
      // Super admin: no filter, sees all
    }

    const users = await User.find(query)
      .select('username name email phoneNumber role status whitelabelId')
      .lean();

    // Get subscriptions for all users
    const userIds = users.map(u => u._id);
    const subscriptions = await Subscription.find({ userId: { $in: userIds } })
      .populate('planId', 'name code features')
      .lean();

    const subMap = {};
    subscriptions.forEach(s => { subMap[s.userId.toString()] = s; });

    const targets = users.map(u => {
      const sub = subMap[u._id.toString()];
      return {
        ...u,
        id: u._id,
        subscription: sub ? {
          status: sub.status,
          planType: sub.planType,
          planName: sub.planId?.name || null,
          eventsRemaining: sub.planId?.features?.maxEventsPerMonth
            ? sub.planId.features.maxEventsPerMonth - (sub.usage?.eventsCreated || 0)
            : -1,
        } : null,
      };
    });

    return { targets };
  }

  /**
   * Get user subscription info
   */
  async getUserSubscriptionInfo(userId) {
    const user = await User.findById(userId).select('role name').lean();
    if (!user) throw new NotFoundError('User');

    // H-10: was findOne({userId}) — would surface cancelled subs at random.
    // Use the canonical helper, then re-populate the fields the lean read
    // expects (findActiveForUser populates 'planId' fully; we filter to
    // the projection here to keep the wire response slim).
    const activeSubs = await Subscription.findActiveForUser(userId);
    const subscription = activeSubs[0] || null;

    if (!subscription) {
      return { subscription: null };
    }

    return {
      subscription: {
        id: subscription._id,
        status: subscription.status,
        planType: subscription.planType,
        planName: subscription.planId?.name || null,
        features: subscription.planId?.features || null,
        eventsRemaining: subscription.planId?.features?.maxEventsPerMonth
          ? subscription.planId.features.maxEventsPerMonth - (subscription.usage?.eventsCreated || 0)
          : -1,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    };
  }

  /**
   * Create event for host (admin action) - rewritten to use eventsService pattern
   */
  async createEventForHost(eventData, guestList, context) {
    const eventsService = require('../events/events.service');
    return eventsService.createEvent(eventData, guestList, context);
  }

  /**
   * Update event status (admin action)
   */
  async updateEventStatus(eventId, status, whitelabelId = undefined) {
    const query = { _id: eventId };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    const current = await Event.findOne(query).select('status previousStatus');
    if (!current) {
      throw new NotFoundError('Event');
    }

    const update = { status };

    if (status === 'cancelled') {
      // Save current status so we can restore it on reactivation
      update.previousStatus = current.status;
    } else if (current.status === 'cancelled') {
      // Reactivating: restore previous status if available, ignore passed status
      update.status = current.previousStatus || status;
      update.previousStatus = null;
    }

    const event = await Event.findOneAndUpdate(
      query,
      update,
      { new: true, runValidators: true }
    );

    // Notify host of event status change by admin (non-blocking)
    if (event?.host) {
      const eventTitle = event.eventDetails?.title || 'Untitled';
      notificationService.sendToUser(event.host, {
        type: 'event_status_change',
        title: 'Event Status Updated',
        titleAr: 'تم تحديث حالة المناسبة',
        message: `Your event "${eventTitle}" status has been updated to ${event.status}.`,
        messageAr: `تم تحديث حالة مناسبتك "${eventTitle}" إلى ${event.status}.`,
        data: { entityType: 'event', entityId: event._id, metadata: { newStatus: event.status } },
      }).catch(console.error);
    }

    return event;
  }

  /**
   * Delete event (admin action)
   */
  async deleteEvent(eventId, whitelabelId = undefined) {
    const query = { _id: eventId };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    const event = await Event.findOne(query);
    if (!event) {
      throw new NotFoundError('Event');
    }

    event.status = 'deleted';
    event.deletedAt = new Date();
    await event.save();

    return { success: true, message: 'Event deleted successfully' };
  }

  /**
   * Bulk delete events
   */
  async bulkDeleteEvents(eventIds, whitelabelId = undefined) {
    const query = { _id: { $in: eventIds } };
    if (whitelabelId !== undefined) {
      query.whitelabelId = whitelabelId;
    }

    const result = await Event.updateMany(
      query,
      {
        status: 'deleted',
        deletedAt: new Date(),
      }
    );

    return {
      success: true,
      deleted: result.modifiedCount,
      message: `${result.modifiedCount} event(s) deleted successfully`,
    };
  }
  // ============================================
  // PAYMENTS (Subscription-based)
  // ============================================

  /**
   * Map subscription status to payment status for display
   * @private
   */
  _mapSubStatusToPayment(subscriptionStatus) {
    switch (subscriptionStatus) {
      case 'active':
      case 'completed':
        return 'completed';
      case 'trial':
        return 'pending';
      case 'cancelled':
      case 'expired':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Get all payments (backed by Subscription records)
   */
  async getPayments({ page = 1, limit = 10, status, from, to, whitelabelId } = {}) {
    const skip = (page - 1) * limit;

    const match = {};
    if (whitelabelId !== undefined) {
      match.whitelabelId = whitelabelId;
    }

    // Map payment status filter back to subscription statuses
    if (status && status !== 'all') {
      const statusMap = {
        completed: { $in: ['active', 'completed'] },
        pending:   'trial',
        failed:    { $in: ['cancelled', 'expired'] },
      };
      if (statusMap[status]) {
        match.status = statusMap[status];
      }
    }

    const dateRange = this._buildDateRangeQuery(from, to);
    if (Object.keys(dateRange).length > 0) {
      match.createdAt = dateRange;
    }

    const baseMatch = whitelabelId !== undefined ? { whitelabelId } : {};

    const [subscriptions, total, statsAgg] = await Promise.all([
      Subscription.find(match)
        .populate('userId', 'name email phoneNumber')
        .populate('planId', 'name nameEn nameAr code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(match),
      Subscription.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: { $sum: '$pricePaid.amount' },
          },
        },
      ]),
    ]);

    const statsByStatus = {};
    let totalRevenue = 0;
    statsAgg.forEach((s) => {
      statsByStatus[s._id] = { count: s.count, revenue: s.revenue || 0 };
      totalRevenue += s.revenue || 0;
    });

    const payments = subscriptions.map((sub) => ({
      _id: sub._id,
      amount: sub.pricePaid?.amount || 0,
      currency: sub.pricePaid?.currency || 'SAR',
      status: this._mapSubStatusToPayment(sub.status),
      hostName: sub.userId?.name || sub.userId?.email || null,
      description: sub.planId?.name || sub.planId?.nameEn || null,
      billingCycle: sub.billingCycle,
      subscriptionStatus: sub.status,
      createdAt: sub.createdAt,
    }));

    return {
      payments,
      stats: {
        totalRevenue,
        pending:   statsByStatus.trial?.count || 0,
        completed: (statsByStatus.active?.count || 0) + (statsByStatus.completed?.count || 0),
        failed:    (statsByStatus.cancelled?.count || 0) + (statsByStatus.expired?.count || 0),
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // EXPORT FUNCTIONALITY
  // ============================================

  async exportHosts(whitelabelId, { search, status, from, to } = {}) {
    let query = { role: ROLES.HOST };
    if (whitelabelId !== undefined) query.whitelabelId = whitelabelId;
    if (search) {
      const searchQuery = this._buildSearchQuery(search, ['username', 'name', 'email', 'phoneNumber']);
      query = { ...query, ...searchQuery };
    }
    if (status) query.status = status;
    const dateRange = this._buildDateRangeQuery(from, to);
    if (Object.keys(dateRange).length > 0) query.createdAt = dateRange;

    const hosts = await User.find(query)
      .select('username name email phoneNumber status createdAt')
      .populate({ path: 'subscription', select: 'planType status' })
      .sort({ createdAt: -1 })
      .lean();

    return hosts.map(h => ({
      Name: h.name || h.username || '-',
      Email: h.email || '-',
      Phone: h.phoneNumber || '-',
      Status: h.status || '-',
      Subscription: h.subscription?.planType || '-',
      'Created At': h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : '-',
    }));
  }

  async exportVendors(whitelabelId, { search, status, category, from, to } = {}) {
    let query = { role: ROLES.VENDOR };
    if (whitelabelId !== undefined) query.whitelabelId = whitelabelId;
    if (search) {
      const searchQuery = this._buildSearchQuery(search, ['name', 'email', 'phoneNumber', 'profile.vendorData.brandName']);
      query = { ...query, ...searchQuery };
    }
    if (status) query['profile.vendorData.vendorStatus'] = status;
    if (category) query['profile.vendorData.serviceCategories'] = category;
    const dateRange = this._buildDateRangeQuery(from, to);
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

  async exportModerators(whitelabelId, { search, status, from, to } = {}) {
    let query = { role: { $in: [ROLES.MODERATOR, ROLES.WHITELABEL_MODERATOR, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN] } };
    if (whitelabelId !== undefined && whitelabelId !== null) {
      query = { role: { $in: [ROLES.WHITELABEL_MODERATOR, ROLES.WHITELABEL_ADMIN] }, whitelabelId };
    } else if (whitelabelId === null) {
      query = { role: { $in: [ROLES.MODERATOR, ROLES.ADMIN] }, whitelabelId: null };
    }
    if (search) {
      const searchQuery = this._buildSearchQuery(search, ['username', 'name', 'email', 'phoneNumber']);
      query = { ...query, ...searchQuery };
    }
    if (status) query.status = status;
    const dateRange = this._buildDateRangeQuery(from, to);
    if (Object.keys(dateRange).length > 0) query.createdAt = dateRange;

    const moderators = await User.find(query)
      .select('username name email phoneNumber role status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return moderators.map(m => ({
      Name: m.name || m.username || '-',
      Email: m.email || '-',
      Phone: m.phoneNumber || '-',
      Role: m.role || '-',
      Status: m.status || '-',
      'Created At': m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : '-',
    }));
  }

  async exportPayments(whitelabelId, { status, from, to } = {}) {
    const match = {};
    if (whitelabelId !== undefined) match.whitelabelId = whitelabelId;
    if (status && status !== 'all') {
      const statusMap = {
        completed: { $in: ['active', 'completed'] },
        pending: 'trial',
        failed: { $in: ['cancelled', 'expired'] },
      };
      if (statusMap[status]) match.status = statusMap[status];
    }
    const dateRange = this._buildDateRangeQuery(from, to);
    if (Object.keys(dateRange).length > 0) match.createdAt = dateRange;

    const subscriptions = await Subscription.find(match)
      .populate('userId', 'name email phoneNumber')
      .populate('planId', 'nameEn nameAr code')
      .sort({ createdAt: -1 })
      .lean();

    return subscriptions.map((sub) => ({
      Host: sub.userId?.name || sub.userId?.email || '-',
      'Host Email': sub.userId?.email || '-',
      Plan: sub.planId?.nameEn || sub.planId?.nameAr || sub.planId?.code || '-',
      Amount: `${sub.pricePaid?.amount || 0} ${sub.pricePaid?.currency || 'SAR'}`,
      'Billing Cycle': sub.billingCycle || '-',
      Status: this._mapSubStatusToPayment(sub.status),
      'Created At': sub.createdAt ? new Date(sub.createdAt).toISOString().split('T')[0] : '-',
    }));
  }

  async exportEvents(whitelabelId, { search, status, from, to } = {}) {
    const query = { status: { $ne: 'deleted' } };
    if (whitelabelId !== undefined) query.whitelabelId = whitelabelId;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query['eventDetails.eventName'] = { $regex: escaped, $options: 'i' };
    }
    if (status) query.status = status;
    const dateRange = this._buildDateRangeQuery(from, to);
    if (Object.keys(dateRange).length > 0) query.createdAt = dateRange;

    const events = await Event.find(query)
      .select('eventDetails status guestList host createdAt')
      .populate({ path: 'host', select: 'name username' })
      .sort({ createdAt: -1 })
      .lean();

    return events.map(e => ({
      Title: e.eventDetails?.eventName || e.eventDetails?.title || '-',
      Host: e.host?.name || e.host?.username || '-',
      Date: e.eventDetails?.date || '-',
      Guests: e.guestList?.length || 0,
      Status: e.status || '-',
      'Created At': e.createdAt ? new Date(e.createdAt).toISOString().split('T')[0] : '-',
    }));
  }

  async exportWhitelabels({ search, status, from, to } = {}) {
    let query = { role: ROLES.WHITELABEL_ADMIN };
    if (search) {
      const searchQuery = this._buildSearchQuery(search, ['username', 'name', 'email', 'phoneNumber']);
      query = { ...query, ...searchQuery };
    }
    if (status) query.status = status;
    const dateRange = this._buildDateRangeQuery(from, to);
    if (Object.keys(dateRange).length > 0) query.createdAt = dateRange;

    const whitelabels = await User.find(query)
      .select('username name email phoneNumber status createdAt')
      .populate('subscription', 'planType status')
      .sort({ createdAt: -1 })
      .lean();

    return whitelabels.map(wl => ({
      Name: wl.name || wl.username || '-',
      Email: wl.email || '-',
      Phone: wl.phoneNumber || '-',
      Status: wl.status || '-',
      Subscription: wl.subscription?.planType || '-',
      'Created At': wl.createdAt ? new Date(wl.createdAt).toISOString().split('T')[0] : '-',
    }));
  }
}

module.exports = new AdminService();