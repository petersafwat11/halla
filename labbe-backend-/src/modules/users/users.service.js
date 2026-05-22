const { NotFoundError, ValidationError } = require("../../shared/errors");

const User = require("../../../models/UserModel");
const {
  processUploadedFiles,
  deleteFromS3,
} = require("../../shared/utils/s3Upload");
const otpService = require("../auth/otp.service");
const logger = require("../../shared/utils/logger");
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
        "-password -passwordResetToken -passwordResetExpires -passwordSetupToken -passwordSetupExpires"
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
      user.profile.vendorData.businessLogo = uploaded.businessLogo;
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

    if (!user.profile) user.profile = {};
    user.profile[section] = mergeSectionData(user.profile[section], data);

    const uploaded = processUploadedFiles(files);

    if (section === "documents") {
      user.profile.documents = user.profile.documents || {};
      if (uploaded.nationalIdImage) {
        await safeDeleteOldKey(user.profile.documents.nationalIdImage);
        user.profile.documents.nationalIdImage = uploaded.nationalIdImage;
      }
      if (uploaded.commercialRecordImage) {
        await safeDeleteOldKey(user.profile.documents.commercialRecordImage);
        user.profile.documents.commercialRecordImage =
          uploaded.commercialRecordImage;
      }
    }

    if (section === "vendorData") {
      const vd = (user.profile.vendorData = user.profile.vendorData || {});

      if (uploaded.businessLogo) {
        await safeDeleteOldKey(vd.businessLogo);
        vd.businessLogo = uploaded.businessLogo;
      }
      if (uploaded.nationalIdImage) {
        await safeDeleteOldKey(vd.nationalIdImage);
        vd.nationalIdImage = uploaded.nationalIdImage;
      }
      if (uploaded.commercialRecordImage) {
        await safeDeleteOldKey(vd.commercialRecordImage);
        vd.commercialRecordImage = uploaded.commercialRecordImage;
      }
      if (uploaded.profileFile) {
        await safeDeleteOldKey(vd.profileFile);
        vd.profileFile = uploaded.profileFile;
      }
      if (uploaded.cv) {
        await safeDeleteOldKey(vd.cv);
        vd.cv = uploaded.cv;
      }
      if (uploaded.portfolioImages?.length) {
        vd.portfolioImages = [
          ...(vd.portfolioImages || []),
          ...uploaded.portfolioImages,
        ];
      }
      if (uploaded.pricePackages?.length) {
        vd.pricePackages = [
          ...(vd.pricePackages || []),
          ...uploaded.pricePackages,
        ];
      }

      const hasName = !!vd.brandName?.trim();
      const hasCategory = !!(
        vd.serviceCategories &&
        Object.values(vd.serviceCategories).some(
          (arr) => Array.isArray(arr) && arr.length > 0
        )
      );
      const hasDescription = !!vd.serviceDescription?.trim();
      const hasPortfolio = !!(vd.portfolioImages?.length > 0);
      vd.profileCompleted =
        hasName && hasCategory && hasDescription && hasPortfolio;
    }

    user.markModified("profile");
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
    const vd = (user.profile.vendorData = user.profile.vendorData || {});

    const arrayFields = new Set(["portfolioImages", "pricePackages"]);

    if (arrayFields.has(field)) {
      const current = Array.isArray(vd[field]) ? vd[field] : [];
      if (!current.includes(key)) {
        throw new NotFoundError(`Image (${field}/${key})`);
      }
      vd[field] = current.filter((k) => k !== key);
      user.markModified("profile");
      await user.save({ validateBeforeSave: false });
      await safeDeleteOldKey(key);
      return { user: await user.toPublicJSON() };
    }

    // Single-value field
    const old = vd[field];
    if (!old) {
      throw new NotFoundError(`Image (${field})`);
    }
    vd[field] = null;
    user.markModified("profile");
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
}

module.exports = new UsersService();
