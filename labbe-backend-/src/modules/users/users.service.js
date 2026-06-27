const { NotFoundError, ValidationError } = require("../../shared/errors");

const User = require("../../../models/UserModel");
const Event = require("../../../models/EventModel");
const Guest = require("../../../models/GuestModel");
const Notification = require("../../../models/NotificationModel");
const NotificationPreferences = require("../../../models/NotificationPreferencesModel");
const RefreshToken = require("../../../models/RefreshTokenModel");
const {
  processUploadedFiles,
  deleteFromS3,
} = require("../../shared/utils/s3Upload");
const otpService = require("../auth/otp.service");
const logger = require("../../shared/utils/logger");
const { USER_STATUS, EVENT_STATUS } = require("../../shared/constants/status");
const {
  validateAndFormatPhone,
  normalizePhoneNumber,
} = require("../../shared/utils/phone");

// Nested keys inside a profile section that should be DEEP-merged so a
// partial update (e.g. `{ socialLinks: { instagram: '...' } }`) does not
// wipe the unmodified siblings.
const DEEP_MERGE_KEYS = new Set(["socialLinks", "serviceLocation"]);

const mergeSectionData = (existing = {}, incoming = {}) => {
  const merged = { ...existing };
  for (const [k, v] of Object.entries(incoming)) {
    if (v === undefined) continue;
    if (DEEP_MERGE_KEYS.has(k) && existing[k] && typeof v === "object" && !Array.isArray(v)) {
      merged[k] = { ...existing[k], ...v };
    } else {
      merged[k] = v;
    }
  }
  return merged;
};

// Best-effort delete of an old single-value image when it is being overwritten
// by a new upload. Errors are logged but never propagated to the caller —
// the new upload has already succeeded.
const safeDeleteOldKey = async (oldKey) => {
  if (!oldKey || typeof oldKey !== "string") return;
  if (oldKey.startsWith("/uploads/") || oldKey.startsWith("uploads/")) return;
  if (oldKey.startsWith("http")) return; // legacy URL — ignore
  try {
    await deleteFromS3(oldKey);
  } catch (err) {
    logger.warn("[users.service] failed to delete old S3 object", {
      key: oldKey,
      error: err.message,
    });
  }
};

class UsersService {
  async getMyProfile(userId) {
    const user = await User.findById(userId)
      .select(
        "-password -passwordResetToken -passwordResetExpires"
      )
      .populate("subscription");

    if (!user) {
      throw new NotFoundError("User");
    }

    return { user: await user.toPublicJSON() };
  }

  async updateMyProfile(userId, updateData, files = {}) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("User");

    if (updateData.username !== undefined) user.username = updateData.username;
    if (updateData.name !== undefined) user.name = updateData.name;
    if (updateData.preferredLanguage !== undefined) {
      user.preferredLanguage = updateData.preferredLanguage;
    }

    // Business accounts may edit their public description (and logo via the
    // `avatar` upload field handled below). `accountType` is immutable here.
    if (user.accountType === "business") {
      const description =
        updateData.description ?? updateData?.businessData?.description;
      if (description !== undefined) {
        user.set("profile.businessData.description", description);
      }
    }

    // Email change resets the verification flag — the existing
    // /auth/send-verification-code flow re-verifies.
    if (
      updateData.email !== undefined &&
      updateData.email.toLowerCase() !== (user.email || "").toLowerCase()
    ) {
      user.email = updateData.email.toLowerCase();
      user.emailVerified = false;
    }

    const uploaded = processUploadedFiles(files);
    if (uploaded.avatar) {
      await safeDeleteOldKey(user.avatar);
      user.avatar = uploaded.avatar;
    }
    if (uploaded.businessLogo && user.profile?.vendorData) {
      await safeDeleteOldKey(user.profile.vendorData.businessLogo);
      // `user.set(path, value)` is the mongoose-idiomatic write — direct
      // property assignment on a mongoose subdocument was silently dropped
      // here (the response said 200 but the DB never persisted the key).
      user.set("profile.vendorData.businessLogo", uploaded.businessLogo);
    }

    await user.save({ validateBeforeSave: false });

    return { user: await user.toPublicJSON() };
  }

  async updateMyPassword(userId, currentPassword, newPassword, passwordConfirm) {
    const user = await User.findById(userId).select("+password");
    if (!user) throw new NotFoundError("User");

    if (!(await user.comparePassword(currentPassword))) {
      throw new ValidationError("Current password is incorrect");
    }

    if (newPassword !== passwordConfirm) {
      throw new ValidationError("Passwords do not match");
    }

    user.password = newPassword;
    user.passwordChangedAt = Date.now() - 1000;
    // Clear the first-login forced-change flag once the user picks their own
    // password (business accounts created by an admin).
    if (user.mustChangePassword) user.mustChangePassword = false;
    await user.save();

    return { success: true };
  }

  async updateMyProfileSection(userId, section, data, files = {}) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("User");

    const validSections = [
      "hostData",
      "vendorData",
      "businessInfo",
      "contactInfo",
      "documents",
    ];
    if (!validSections.includes(section)) {
      throw new ValidationError(`Invalid profile section: ${section}`);
    }

    if (section === "vendorData" && data.socialLinks?.whatsapp) {
      const parsedWhatsApp = validateAndFormatPhone(data.socialLinks.whatsapp);
      if (!parsedWhatsApp.isValid) {
        throw new ValidationError(parsedWhatsApp.error || "Invalid WhatsApp number");
      }
      data = {
        ...data,
        socialLinks: { ...data.socialLinks, whatsapp: parsedWhatsApp.formatted },
      };
    }

    if (!user.profile) user.profile = {};
    // `user.set(path, value)` instead of property assignment — mongoose
    // subdocs silently dropped direct `user.profile.vendorData = {...}` /
    // `vd.field = value` writes here, so PATCH said 200 but the DB never
    // persisted anything.
    const sectionMerged = mergeSectionData(user.profile[section], data);
    user.set(`profile.${section}`, sectionMerged);

    const uploaded = processUploadedFiles(files);

    if (section === "documents") {
      if (!user.profile.documents) user.profile.documents = {};
      if (uploaded.nationalIdImage) {
        await safeDeleteOldKey(user.profile.documents.nationalIdImage);
        user.set("profile.documents.nationalIdImage", uploaded.nationalIdImage);
      }
      if (uploaded.commercialRecordImage) {
        await safeDeleteOldKey(user.profile.documents.commercialRecordImage);
        user.set(
          "profile.documents.commercialRecordImage",
          uploaded.commercialRecordImage
        );
      }
    }

    if (section === "vendorData") {
      if (!user.profile.vendorData) user.profile.vendorData = {};
      const vd = user.profile.vendorData;

      if (uploaded.businessLogo) {
        await safeDeleteOldKey(vd.businessLogo);
        user.set("profile.vendorData.businessLogo", uploaded.businessLogo);
      }
      if (uploaded.nationalIdImage) {
        await safeDeleteOldKey(vd.nationalIdImage);
        user.set("profile.vendorData.nationalIdImage", uploaded.nationalIdImage);
      }
      if (uploaded.commercialRecordImage) {
        await safeDeleteOldKey(vd.commercialRecordImage);
        user.set(
          "profile.vendorData.commercialRecordImage",
          uploaded.commercialRecordImage
        );
      }
      if (uploaded.profileFile) {
        await safeDeleteOldKey(vd.profileFile);
        user.set("profile.vendorData.profileFile", uploaded.profileFile);
      }
      if (uploaded.cv) {
        await safeDeleteOldKey(vd.cv);
        user.set("profile.vendorData.cv", uploaded.cv);
      }
      if (uploaded.portfolioImages?.length) {
        user.set("profile.vendorData.portfolioImages", [
          ...(vd.portfolioImages || []),
          ...uploaded.portfolioImages,
        ]);
      }
      if (uploaded.pricePackages?.length) {
        user.set("profile.vendorData.pricePackages", [
          ...(vd.pricePackages || []),
          ...uploaded.pricePackages,
        ]);
      }

      // Re-read after the set()s above so we're checking the live values.
      const liveVd = user.profile.vendorData;
      const hasName = !!liveVd.brandName?.trim();
      const hasCategory = !!(
        liveVd.serviceCategories &&
        Object.values(liveVd.serviceCategories).some(
          (arr) => Array.isArray(arr) && arr.length > 0
        )
      );
      const hasDescription = !!liveVd.serviceDescription?.trim();
      const hasPortfolio = !!(liveVd.portfolioImages?.length > 0);
      user.set(
        "profile.vendorData.profileCompleted",
        hasName && hasCategory && hasDescription && hasPortfolio
      );
    }

    await user.save({ validateBeforeSave: false });
    return { user: await user.toPublicJSON() };
  }

  // ==========================================================================
  // PHONE CHANGE (OTP-GATED)
  // ==========================================================================

  /**
   * Send an SMS OTP to the new phone number. Validates the format and
   * ensures the number isn't already in use by another account.
   */
  async sendPhoneChangeOtp(userId, phoneNumber, lang = "ar") {
    const formatted = validateAndFormatPhone(phoneNumber);
    if (!formatted.isValid) {
      throw new ValidationError(formatted.error || "Invalid phone number");
    }
    const normalized = formatted.formatted;

    const existing = await User.findOne({
      $or: [{ mobile: normalized }, { phoneNumber: normalized }],
      _id: { $ne: userId },
    })
      .select("_id")
      .lean();
    if (existing) {
      throw new ValidationError(
        "This phone number is already registered to another account"
      );
    }

    const result = await otpService.sendOTP(normalized, lang);
    if (!result.success) {
      throw new ValidationError(result.error || "Failed to send OTP");
    }
    return { success: true };
  }

  /**
   * Verify the OTP and write the new phone number onto the user record.
   * Sets both `mobile` (canonical) and `phoneNumber` (legacy mirror) so
   * older read paths continue to find the user.
   */
  async updatePhone(userId, phoneNumber, otp) {
    const formatted = validateAndFormatPhone(phoneNumber);
    if (!formatted.isValid) {
      throw new ValidationError(formatted.error || "Invalid phone number");
    }
    const normalized = formatted.formatted;

    const verification = await otpService.verifyOTP(normalized, otp);
    if (!verification.success) {
      throw new ValidationError(verification.error || "Invalid OTP");
    }

    const conflicting = await User.findOne({
      $or: [{ mobile: normalized }, { phoneNumber: normalized }],
      _id: { $ne: userId },
    })
      .select("_id")
      .lean();
    if (conflicting) {
      throw new ValidationError(
        "This phone number is already registered to another account"
      );
    }

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("User");

    user.mobile = normalized;
    user.phoneNumber = normalized;
    await user.save({ validateBeforeSave: false });

    return { user: await user.toPublicJSON() };
  }

  // ==========================================================================
  // IMAGE DELETE
  // ==========================================================================

  /**
   * Remove a single image from the vendor's profile.
   *
   * - Single-value fields (businessLogo, nationalIdImage, commercialRecordImage,
   *   profileFile, cv, avatar) — `key` is ignored, the stored value is wiped.
   * - Array fields (portfolioImages, pricePackages) — `key` must match an
   *   element exactly; that element is removed from the array.
   *
   * Deletes the underlying S3 object on a best-effort basis.
   */
  async deleteVendorImage(userId, field, key) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("User");

    if (field === "avatar") {
      const old = user.avatar;
      user.avatar = null;
      await user.save({ validateBeforeSave: false });
      await safeDeleteOldKey(old);
      return { user: await user.toPublicJSON() };
    }

    if (!user.profile) user.profile = {};
    if (!user.profile.vendorData) user.profile.vendorData = {};
    const vd = user.profile.vendorData;
    const path = `profile.vendorData.${field}`;

    const arrayFields = new Set(["portfolioImages", "pricePackages"]);

    if (arrayFields.has(field)) {
      const current = Array.isArray(vd[field]) ? vd[field] : [];
      if (!current.includes(key)) {
        throw new NotFoundError(`Image (${field}/${key})`);
      }
      // `user.set(path, value)` is the mongoose-idiomatic way to write a
      // nested path — it marks the path dirty and routes through the schema
      // setter so the change is persisted (direct property assignment on a
      // mongoose subdocument was failing to save the new value).
      user.set(path, current.filter((k) => k !== key));
      await user.save({ validateBeforeSave: false });
      await safeDeleteOldKey(key);
      return { user: await user.toPublicJSON() };
    }

    // Single-value field
    const old = vd[field];
    if (!old) {
      throw new NotFoundError(`Image (${field})`);
    }
    user.set(path, null);
    await user.save({ validateBeforeSave: false });
    await safeDeleteOldKey(old);
    return { user: await user.toPublicJSON() };
  }

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  async getNotificationPreferences(userId) {
    const user = await User.findById(userId).select("notificationPreferences");
    if (!user) throw new NotFoundError("User");

    const stored = user.notificationPreferences || {};
    return {
      preferences: {
        appNotifications: stored.appNotifications || {},
        emailNotifications: stored.emailNotifications || {},
        smsNotifications: stored.smsNotifications || {},
      },
    };
  }

  async updateNotificationPreferences(userId, preferences) {
    const user = await User.findByIdAndUpdate(
      userId,
      { notificationPreferences: preferences },
      { new: true, runValidators: true }
    ).select("notificationPreferences");

    if (!user) throw new NotFoundError("User");

    return { preferences: user.notificationPreferences };
  }

  /**
   * Self-service account deletion (Apple 5.1.1(v) / Google Play data-deletion).
   *
   * Removes/anonymizes the user's personal data: soft-deletes + anonymizes the
   * User (so financial/audit foreign keys stay valid), cascade-soft-deletes
   * owned events and their guests (third-party guest PII), drops
   * notifications/preferences, revokes all sessions, and best-effort deletes the
   * user's S3 assets (avatar + vendor documents incl. national ID). Payments,
   * subscriptions, and audit logs are retained for legal/accounting per policy.
   *
   * Cascade steps are best-effort (logged, non-fatal) so a single failure can't
   * leave the account un-closed; the final User anonymization always runs.
   */
  async deleteMyAccount(userId) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("User");

    // 1) Revoke every active session immediately.
    try {
      await RefreshToken.updateMany(
        { userId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    } catch (err) {
      logger.warn("[users.service] deleteMyAccount: token revoke failed", {
        userId: String(userId),
        error: err.message,
      });
    }

    // 2) Collect the user's S3 keys before anonymizing the record.
    const vd = user.profile?.vendorData || {};
    const s3Keys = [
      user.avatar,
      vd.businessLogo,
      vd.nationalIdImage,
      vd.commercialRecordImage,
      vd.profileFile,
      ...(Array.isArray(vd.portfolioImages) ? vd.portfolioImages : []),
    ].filter((k) => typeof k === "string" && k && !k.startsWith("http"));

    // 3) Cascade owned events + their guests (clears third-party guest PII).
    try {
      const events = await Event.find({ host: userId }).select("_id");
      const eventIds = events.map((e) => e._id);
      if (eventIds.length) {
        await Event.updateMany(
          { _id: { $in: eventIds } },
          { $set: { status: EVENT_STATUS.DELETED, deletedAt: new Date() } }
        );
        await Guest.updateMany(
          { event: { $in: eventIds } },
          { $set: { deleted: true, deletedAt: new Date() } }
        );
      }
    } catch (err) {
      logger.warn("[users.service] deleteMyAccount: event cascade failed", {
        userId: String(userId),
        error: err.message,
      });
    }

    // 4) Drop notifications + preferences.
    try {
      await Notification.deleteMany({ userId });
      await NotificationPreferences.deleteMany({ userId });
    } catch (err) {
      logger.warn("[users.service] deleteMyAccount: notification cleanup failed", {
        userId: String(userId),
        error: err.message,
      });
    }

    // 5) Best-effort S3 cleanup (avatar + vendor documents).
    for (const key of s3Keys) {
      try {
        await deleteFromS3(key);
      } catch (err) {
        logger.warn("[users.service] deleteMyAccount: S3 delete failed", {
          key,
          error: err.message,
        });
      }
    }

    // 6) Anonymize PII + close the account. `$unset` (not null) on the
    //    unique-sparse contact fields avoids unique-index collisions across
    //    multiple deleted accounts. updateOne bypasses pre-save hooks/validators.
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          name: "Deleted User",
          status: USER_STATUS.DELETED,
          deletedAt: new Date(),
          deletedBy: userId,
        },
        $unset: {
          email: "",
          mobile: "",
          phoneNumber: "",
          username: "",
          avatar: "",
          pushTokens: "",
        },
      }
    );

    return { deleted: true };
  }
}

module.exports = new UsersService();
