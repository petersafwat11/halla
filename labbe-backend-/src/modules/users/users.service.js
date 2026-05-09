const { NotFoundError, ValidationError } = require("../../shared/errors");

const User = require("../../../models/UserModel");
const { processUploadedFiles } = require("../../shared/utils/s3Upload");

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

    return { user: user.toPublicJSON ? user.toPublicJSON() : user };
  }

  async updateMyProfile(userId, updateData, files = {}) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("User");

    const allowedFields = [
      "username",
      "name",
      "email",
      "profile",
      "preferredLanguage",
    ];
    allowedFields.forEach((field) => {
      if (updateData[field] === undefined) return;
      if (field === "profile") {
        // Only allow updating the role-appropriate data section
        const roleDataMap = {
          host: "hostData",
          vendor: "vendorData",
          whitelabel_admin: "whitelabelData",
          whitelabel_moderator: "whitelabelData",
          guest: "guestData",
        };
        const allowedSection = roleDataMap[user.role];
        if (allowedSection && updateData.profile?.[allowedSection]) {
          if (!user.profile) user.profile = {};
          user.profile[allowedSection] = {
            ...(user.profile[allowedSection] || {}),
            ...updateData.profile[allowedSection],
          };
        }
      } else {
        user[field] = updateData[field];
      }
    });

    const uploadedUrls = processUploadedFiles(files);
    if (uploadedUrls.avatar) {
      user.avatar = uploadedUrls.avatar;
    }
    if (uploadedUrls.businessLogo && user.profile?.vendorData) {
      user.profile.vendorData.businessLogo = uploadedUrls.businessLogo;
    }

    await user.save({ validateBeforeSave: false });

    return { user: user.toPublicJSON ? user.toPublicJSON() : user };
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
    user.profile[section] = { ...user.profile[section], ...data };

    const uploadedUrls = processUploadedFiles(files);

    if (section === "documents") {
      if (uploadedUrls.nationalIdImage) {
        user.profile.documents = user.profile.documents || {};
        user.profile.documents.nationalIdImage = uploadedUrls.nationalIdImage;
      }
      if (uploadedUrls.commercialRecordImage) {
        user.profile.documents = user.profile.documents || {};
        user.profile.documents.commercialRecordImage =
          uploadedUrls.commercialRecordImage;
      }
    }

    if (section === "vendorData") {
      const vd = (user.profile.vendorData = user.profile.vendorData || {});
      if (uploadedUrls.businessLogo) {
        vd.businessLogo = uploadedUrls.businessLogo;
      }
      if (uploadedUrls.nationalIdImage) {
        vd.nationalIdImage = uploadedUrls.nationalIdImage;
      }
      if (uploadedUrls.commercialRecordImage) {
        vd.commercialRecordImage = uploadedUrls.commercialRecordImage;
      }
      if (uploadedUrls.portfolioImages?.length) {
        vd.portfolioImages = [
          ...(vd.portfolioImages || []),
          ...uploadedUrls.portfolioImages,
        ];
      }
      if (uploadedUrls.pricePackages?.length) {
        vd.pricePackages = [
          ...(vd.pricePackages || []),
          ...uploadedUrls.pricePackages,
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

    await user.save({ validateBeforeSave: false });
    return { user: user.toPublicJSON ? user.toPublicJSON() : user };
  }

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
