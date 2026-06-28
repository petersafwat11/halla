const { NotFoundError, ValidationError } = require("../../shared/errors");

const User = require("../../../models/UserModel");
const Event = require("../../../models/EventModel");
const Guest = require("../../../models/GuestModel");
const Notification = require("../../../models/NotificationModel");
const NotificationPreferences = require("../../../models/NotificationPreferencesModel");
const RefreshToken = require("../../../models/RefreshTokenModel");
const Ticket = require("../../../models/TicketModel");
const PostEventContent = require("../../../models/PostEventContentModel");
const Service = require("../../../models/ServiceModel");
const Subscription = require("../../../models/SubscriptionModel");
const AccountDeletionRequest = require("../../../models/AccountDeletionRequestModel");
const {
  processUploadedFiles,
  deleteFromS3,
} = require("../../shared/utils/s3Upload");
const otpService = require("../auth/otp.service");
const logger = require("../../shared/utils/logger");
const { logAudit } = require("../../shared/utils/auditLog");
const { containsProhibited } = require("../../shared/utils/contentFilter");
const {
  RETAINED,
  LEGAL_FINALIZED,
  DISCLOSURE,
} = require("../../shared/constants/dataRetention");
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

    // UGC text filter (§6): vendor profile copy is shown to other users.
    if (section === "vendorData") {
      const textFields = [
        "brandName",
        "ownerFullName",
        "serviceDescription",
        "taglineAr",
        "taglineEn",
        "aboutAr",
        "aboutEn",
        "otherData",
      ];
      for (const f of textFields) {
        if (data[f] && containsProhibited(data[f]).blocked) {
          const err = new ValidationError(
            "Your profile text contains content that isn't allowed"
          );
          err.code = "PROHIBITED_CONTENT";
          throw err;
        }
      }
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
   * Verify reauthentication before a destructive account action (SHIP §4.1).
   * Accepts the account password, or a verified OTP to the user's phone for
   * OTP-only accounts. `user` must be loaded WITH +password (the protect
   * middleware already selects it). Throws ValidationError (with a `code`) on
   * failure so the client can branch (password vs OTP).
   */
  async verifyReauth(user, { password, otp } = {}) {
    // Password accounts MUST reauthenticate with their password (knowledge
    // factor) — we don't let a password user fall back to phone-possession OTP
    // for an irreversible action. Phone-only (password-less) accounts use OTP.
    if (user.password) {
      if (!password) {
        const err = new ValidationError("Password required");
        err.code = "REAUTH_PASSWORD_REQUIRED";
        throw err;
      }
      const ok =
        typeof user.comparePassword === "function" &&
        (await user.comparePassword(password));
      if (!ok) {
        const err = new ValidationError("Incorrect password");
        err.code = "REAUTH_FAILED";
        throw err;
      }
      return true;
    }

    if (!otp) {
      const err = new ValidationError("Verification code required");
      err.code = "REAUTH_OTP_REQUIRED";
      throw err;
    }
    if (!user.phoneNumber) {
      const err = new ValidationError("No phone number on file for verification");
      err.code = "NO_PHONE";
      throw err;
    }
    const result = await otpService.verifyOTP(user.phoneNumber, otp);
    if (!result?.success) {
      const err = new ValidationError("Invalid or expired code");
      err.code = "REAUTH_FAILED";
      throw err;
    }
    return true;
  }

  _deletionResult(reqDoc) {
    return {
      requestId: reqDoc.requestId,
      status: reqDoc.status,
      retained: DISCLOSURE,
    };
  }

  /**
   * Send a reauth OTP to the current user's verified phone (for password-less
   * accounts deleting via OTP). §4.1.
   */
  async sendDeletionReauthOtp(user) {
    if (!user.phoneNumber) {
      const err = new ValidationError("No phone number on file for verification");
      err.code = "NO_PHONE";
      throw err;
    }
    const result = await otpService.sendOTP(
      user.phoneNumber,
      user.preferredLanguage || "ar"
    );
    if (!result?.success) {
      const err = new ValidationError("Could not send verification code");
      err.code = "OTP_SEND_FAILED";
      throw err;
    }
    return { sent: true };
  }

  /**
   * Info shown BEFORE deletion so the client can warn the user (SHIP §4.2).
   * Flags an active store (IAP) subscription that keeps billing after the Halaa
   * account is gone, with the platform-correct store subscription manager URL.
   */
  async getPreDeletionInfo(userId) {
    let hasActiveStoreSubscription = false;
    try {
      const sub = await Subscription.findOne({
        userId,
        status: { $in: ["active", "trial"] },
      }).lean();
      hasActiveStoreSubscription = Boolean(
        sub &&
          (sub.provider === "revenuecat" ||
            sub.provider === "appstore" ||
            sub.provider === "playstore" ||
            sub?.metadata?.source === "revenuecat")
      );
    } catch {
      /* non-fatal */
    }
    return {
      hasActiveStoreSubscription,
      storeManageUrls: {
        ios: "https://apps.apple.com/account/subscriptions",
        android: "https://play.google.com/store/account/subscriptions",
      },
      retained: DISCLOSURE,
      retentionFinalized: LEGAL_FINALIZED,
    };
  }

  /**
   * Self-service account deletion (Apple 5.1.1(v) / Google Play data-deletion;
   * SHIP §4.1). Idempotent, reauthenticated workflow shared by app + web:
   *
   *  - immediately revokes all sessions (refresh tokens); already-issued access
   *    JWTs stop working because the soft-deleted user is excluded by the
   *    UserModel pre-find hook (protect's findById returns null → 401), with the
   *    explicit DELETED-status branch in protect as a belt-and-suspenders guard;
   *  - deletes/anonymizes ALL personal data: User PII + nested profile, owned
   *    events, third-party guest names/phones/RSVP, post-event photos/videos/
   *    comments (+ their S3), vendor services (+ S3), support tickets,
   *    notifications, and every collected S3 object;
   *  - RETAINS only the legal/accounting rows in the (configurable) retention
   *    matrix, pseudonymized (the referenced user is anonymized);
   *  - records a durable AccountDeletionRequest (requestId + status + steps) and
   *    an append-only audit event (IDs/status only, never PII).
   *
   * Steps are best-effort + recorded; a mandatory-step failure yields a
   * 'partial' status (not 'completed') instead of a false success. The final
   * User anonymization always runs so the account is closed regardless.
   */
  async deleteMyAccount(userId, { channel = "app" } = {}) {
    const user = await User.findById(userId);
    const latest = await AccountDeletionRequest.findOne({ userId }).sort({
      createdAt: -1,
    });

    // Idempotent: already deleted/anonymized → return the latest request.
    if (!user) {
      if (latest) return this._deletionResult(latest);
      throw new NotFoundError("User");
    }

    const reqDoc =
      latest && latest.status === "processing"
        ? latest
        : await AccountDeletionRequest.create({
            userId,
            channel,
            retainedDisclosure: { retained: RETAINED, legalFinalized: LEGAL_FINALIZED },
          });

    const steps = [];
    let mandatoryFailed = false;
    const run = async (name, fn, mandatory = false) => {
      try {
        await fn();
        steps.push({ name, status: "ok", mandatory });
      } catch (err) {
        steps.push({ name, status: "failed", mandatory, error: err.message });
        if (mandatory) mandatoryFailed = true;
        logger.warn(`[deleteMyAccount] step '${name}' failed`, {
          userId: String(userId),
          error: err.message,
        });
      }
    };

    const isS3Key = (k) =>
      typeof k === "string" &&
      k &&
      !k.startsWith("http") &&
      !k.startsWith("/uploads/") &&
      !k.startsWith("uploads/");
    const s3Keys = new Set();
    const addKey = (k) => {
      if (isS3Key(k)) s3Keys.add(k);
    };

    // 1) Revoke every active session immediately (mandatory).
    await run(
      "revoke_sessions",
      async () => {
        await RefreshToken.updateMany(
          { userId, revokedAt: null },
          { $set: { revokedAt: new Date() } }
        );
      },
      true
    );

    // User-owned S3 keys: avatar + vendor documents/portfolio/price packages.
    const vd = user.profile?.vendorData || {};
    [
      user.avatar,
      vd.businessLogo,
      vd.nationalIdImage,
      vd.commercialRecordImage,
      vd.profileFile,
      ...(Array.isArray(vd.portfolioImages) ? vd.portfolioImages : []),
      ...(Array.isArray(vd.pricePackages) ? vd.pricePackages : []),
    ].forEach(addKey);

    // 2) Cascade owned events + anonymize their guests' third-party PII.
    await run(
      "anonymize_events_and_guests",
      async () => {
        const events = await Event.find({ host: userId }).select(
          "_id templateImage branding"
        );
        const eventIds = events.map((e) => e._id);
        events.forEach((e) => {
          addKey(e.templateImage);
          addKey(e.branding?.logoKey);
        });
        if (eventIds.length) {
          // Soft-delete AND scrub the PII-bearing event fields (title,
          // location, description, branding) so no personal content survives —
          // the row is kept only for accounting/referential integrity, matching
          // the "events are removed" disclosure.
          await Event.updateMany(
            { _id: { $in: eventIds } },
            {
              $set: {
                status: EVENT_STATUS.DELETED,
                deletedAt: new Date(),
                "eventDetails.title": "Deleted Event",
              },
              $unset: {
                "eventDetails.location": "",
                "eventDetails.description": "",
                branding: "",
              },
            }
          );
          await Guest.updateMany(
            { event: { $in: eventIds } },
            {
              $set: {
                deleted: true,
                deletedAt: new Date(),
                name: "Deleted Guest",
                phone: "",
                "rsvp.message": "",
                "rsvp.dietaryRestrictions": "",
                "checkIn.checkedInByStaff.name": "",
                "checkIn.checkedInByStaff.phone": "",
              },
            }
          );
        }
      },
      true
    );

    // 3) Delete post-event content (media/comments + their images), collecting
    //    S3 keys first.
    await run(
      "delete_post_event_content",
      async () => {
        const contents = await PostEventContent.find({ host: userId }).lean();
        for (const c of contents) {
          (c.media || []).forEach((m) => {
            addKey(m.url);
            (m.comments || []).forEach((cm) =>
              (cm.images || []).forEach((img) => addKey(img.url))
            );
          });
          (c.comments || []).forEach((cm) =>
            (cm.images || []).forEach((img) => addKey(img.url))
          );
        }
        await PostEventContent.deleteMany({ host: userId });
      },
      true
    );

    // 4) Delete the user's vendor services + their images.
    await run(
      "delete_vendor_services",
      async () => {
        const services = await Service.find({ vendorId: userId })
          .select("image")
          .lean();
        services.forEach((s) => addKey(s.image));
        await Service.deleteMany({ vendorId: userId });
      },
      true
    );

    // 5) Delete support tickets (contain user-submitted text).
    await run(
      "delete_tickets",
      async () => {
        await Ticket.deleteMany({ user: userId });
      },
      true
    );

    // 6) Drop notifications + preferences.
    await run(
      "delete_notifications",
      async () => {
        await Notification.deleteMany({ userId });
        await NotificationPreferences.deleteMany({ userId });
      },
      true
    );

    // 7) Best-effort S3 cleanup (non-mandatory — a failure marks the request
    //    'partial' and can be retried, but must never block closing the account).
    await run(
      "delete_s3_objects",
      async () => {
        const failures = [];
        for (const key of s3Keys) {
          const ok = await deleteFromS3(key);
          if (ok === false) failures.push(key);
        }
        if (failures.length) {
          throw new Error(`${failures.length} S3 object(s) not deleted`);
        }
      },
      false
    );

    // 8) Anonymize PII + close the account (mandatory, always last). `$unset`
    //    on unique-sparse contact fields avoids unique-index collisions across
    //    deleted accounts; updateOne bypasses pre-save hooks/validators.
    await run(
      "anonymize_user",
      async () => {
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
              "profile.vendorData": "",
              "profile.businessData": "",
              "profile.hostData.bio": "",
              "profile.hostData.company": "",
              "profile.hostData.position": "",
            },
          }
        );
      },
      true
    );

    reqDoc.steps = steps;
    reqDoc.status = mandatoryFailed ? "partial" : "completed";
    reqDoc.completedAt = new Date();
    await reqDoc.save();

    // Append-only audit event (IDs/status only — never deleted PII).
    logAudit({
      action: "user.account_deleted",
      actor: { _id: userId, role: user.role },
      targetType: "user",
      targetId: userId,
      metadata: { requestId: reqDoc.requestId, channel, status: reqDoc.status },
      status: mandatoryFailed ? "failure" : "success",
    }).catch(() => {});

    return this._deletionResult(reqDoc);
  }

  /**
   * Public status lookup for the /delete-account page + app (keyed by the
   * unguessable requestId; returns status only, never PII).
   */
  async getDeletionStatus(requestId) {
    const reqDoc = await AccountDeletionRequest.findOne({ requestId }).lean();
    if (!reqDoc) throw new NotFoundError("Deletion request");
    return {
      requestId: reqDoc.requestId,
      status: reqDoc.status,
      requestedAt: reqDoc.requestedAt,
      completedAt: reqDoc.completedAt || null,
      retained: DISCLOSURE,
    };
  }
}

module.exports = new UsersService();
