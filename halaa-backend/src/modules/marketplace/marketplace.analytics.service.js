/**
 * Marketplace Analytics Service
 * Deduplicated, side-effect-free analytics event tracking for marketplace
 * @module modules/marketplace/marketplace.analytics.service
 */

const crypto = require("crypto");
const mongoose = require("mongoose");
const Service = require("../../../models/ServiceModel");
const User = require("../../../models/UserModel");
const { USER_STATUS, VENDOR_STATUS, SERVICE_STATUS } = require("../../shared/constants");
const { NotFoundError, ValidationError } = require("../../shared/errors");
const logger = require("../../shared/utils/logger");

const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour sliding window

class MarketplaceAnalyticsService {
  constructor() {
    this._dedupCache = new Map();
    this._lastPrune = Date.now();
  }

  /**
   * Periodic pruning of expired deduplication cache keys
   * @private
   */
  _prune() {
    const now = Date.now();
    if (now - this._lastPrune < 60000) return; // prune at most once a minute
    this._lastPrune = now;
    for (const [key, timestamp] of this._dedupCache.entries()) {
      if (now - timestamp > DEDUP_WINDOW_MS) {
        this._dedupCache.delete(key);
      }
    }
  }

  /**
   * Generate canonical deduplication key
   * @private
   */
  _buildDeduplicationKey(eventType, targetType, targetId, actorId, actorIp, userAgent) {
    let actorKey;
    if (actorId) {
      actorKey = `user:${actorId}`;
    } else {
      const raw = `${actorIp || "anon"}:${userAgent || "unknown"}`;
      actorKey = `ip:${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16)}`;
    }
    return `${eventType}:${targetType}:${targetId}:${actorKey}`;
  }

  /**
   * Track marketplace analytics event
   * @param {Object} params
   * @param {string} params.eventType - 'service_view' | 'vendor_view' | 'contact_click'
   * @param {string} params.targetType - 'service' | 'vendor'
   * @param {string} params.targetId - Target entity ObjectId
   * @param {string} [params.contactMethod] - 'whatsapp' | 'phone' | 'email' | 'website' | 'social' | 'service_request'
   * @param {Object} [params.metadata] - Arbitrary interaction metadata
   * @param {string} [params.actorId] - Authenticated user ID (if any)
   * @param {string} [params.actorIp] - Client IP address
   * @param {string} [params.userAgent] - Client User Agent
   * @returns {Promise<Object>} Tracking result { success: true, tracked: boolean, reason?: string }
   */
  async trackEvent({
    eventType,
    targetType,
    targetId,
    contactMethod = null,
    metadata = {},
    actorId = null,
    actorIp = null,
    userAgent = null,
  }) {
    if (!mongoose.isValidObjectId(targetId)) {
      throw new ValidationError("Invalid targetId ObjectId");
    }

    this._prune();

    const dedupKey = this._buildDeduplicationKey(
      eventType,
      targetType,
      targetId,
      actorId,
      actorIp,
      userAgent
    );

    const now = Date.now();
    const lastTracked = this._dedupCache.get(dedupKey);
    if (lastTracked && now - lastTracked < DEDUP_WINDOW_MS) {
      return {
        success: true,
        tracked: false,
        reason: "deduplicated",
        eventType,
        targetId,
      };
    }

    if (targetType === "service") {
      const service = await Service.findById(targetId).select("_id vendorId status isPublic").lean();
      if (!service || service.status !== SERVICE_STATUS.ACTIVE || !service.isPublic) {
        throw new NotFoundError("Service");
      }

      // Self-interaction check: vendor viewing/clicking their own service
      if (actorId && String(service.vendorId) === String(actorId)) {
        return {
          success: true,
          tracked: false,
          reason: "self_interaction",
          eventType,
          targetId,
        };
      }

      // Perform atomic updates
      if (eventType === "service_view") {
        await Promise.all([
          Service.updateOne({ _id: service._id }, { $inc: { viewCount: 1 } }),
          User.updateOne(
            { _id: service.vendorId },
            { $inc: { "profile.vendorData.totalViews": 1 } }
          ),
        ]);
      } else if (eventType === "contact_click") {
        await Promise.all([
          Service.updateOne({ _id: service._id }, { $inc: { contactCount: 1 } }),
          User.updateOne(
            { _id: service.vendorId },
            { $inc: { "profile.vendorData.numberOfClicks": 1 } }
          ),
        ]);
      } else if (eventType === "vendor_view") {
        await User.updateOne(
          { _id: service.vendorId },
          { $inc: { "profile.vendorData.totalViews": 1 } }
        );
      }
    } else if (targetType === "vendor") {
      const vendor = await User.findOne({
        _id: targetId,
        role: "vendor",
        status: USER_STATUS.ACTIVE,
        "profile.vendorData.vendorStatus": VENDOR_STATUS.APPROVED,
      })
        .select("_id")
        .lean();

      if (!vendor) {
        throw new NotFoundError("Vendor");
      }

      // Self-interaction check: vendor viewing their own profile
      if (actorId && String(vendor._id) === String(actorId)) {
        return {
          success: true,
          tracked: false,
          reason: "self_interaction",
          eventType,
          targetId,
        };
      }

      // Perform atomic updates
      if (eventType === "vendor_view" || eventType === "service_view") {
        await User.updateOne(
          { _id: vendor._id },
          { $inc: { "profile.vendorData.totalViews": 1 } }
        );
      } else if (eventType === "contact_click") {
        await User.updateOne(
          { _id: vendor._id },
          { $inc: { "profile.vendorData.numberOfClicks": 1 } }
        );
      }
    }

    // Record cache hit
    this._dedupCache.set(dedupKey, now);

    return {
      success: true,
      tracked: true,
      eventType,
      targetType,
      targetId,
    };
  }

  /**
   * Clear deduplication cache (useful for testing)
   */
  clearDeduplicationCache() {
    this._dedupCache.clear();
  }

  /**
   * Get size of deduplication cache
   */
  getDeduplicationStats() {
    return {
      cacheSize: this._dedupCache.size,
    };
  }
}

module.exports = new MarketplaceAnalyticsService();
