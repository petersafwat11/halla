/**
 * Post-Event Content Service
 * Business logic for post-event content management. Bulk Taqnyat dispatch
 * lives in `post-event.dispatch.service.js`.
 * @module modules/post-event/post-event.service
 */

const config = require('../../config');
const jwt = require('jsonwebtoken');

const {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} = require('../../shared/errors');
const AppError = require('../../shared/errors/AppError');

const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');
const GuestAccessToken = require('../../../models/GuestAccessTokenModel');
const PostEventContent = require('../../../models/PostEventContentModel');

const { runBatched } = require('../../shared/utils/runBatched');
const { logAudit } = require('../../shared/utils/auditLog');
const logger = require('../../shared/utils/logger');
const { GUEST_STATUS } = require('../../shared/constants');
const { ROLES } = require('../../shared/constants/roles');
const { resolveTaqnyatTemplateRef } = require('../events/templateRefResolver');

const dispatchService = require('./post-event.dispatch.service');

// ============================================
// SCOPED QUERY HELPER
// ============================================

/**
 * Build a role-scoped query for an event. Mirrors
 * `events.crud.service._buildScopedEventQuery` so post-event endpoints
 * accept the same set of authorized roles:
 *
 *   - HOST                          → own event only
 *   - SUPER_ADMIN, ADMIN, MODERATOR → any event (platform-wide)
 *
 * Centralized here so every host-facing post-event method opts into the
 * same authorization model rather than the bare `host: userId` check
 * which silently 404s for any role that isn't the event owner.
 *
 * @param {string} eventId
 * @param {Object} user - req.user shape: { _id, role }
 * @returns {Object} Mongo query
 */
const buildScopedEventQuery = (eventId, user) => {
  const role = user?.role;
  const userId = user?._id?.toString?.() || user?._id;

  if (!role && !userId) {
    throw new ForbiddenError('Authentication context is required');
  }

  // super_admin / admin / moderator may view or edit ANY event
  // platform-wide.
  const platformWide = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR];
  if (platformWide.includes(role)) {
    return { _id: eventId };
  }

  // Default: host (and any other authenticated role) sees only their own.
  return { _id: eventId, host: userId };
};

// ============================================
// HELPERS
// ============================================

/**
 * Build a `status` query fragment from the guest filter shortcut used by
 * the host-facing UI:
 *   - 'attended'  → guests who checked in (DB enum: 'checked_in')
 *   - 'confirmed' → confirmed RSVPs plus those who checked in
 *   - 'all'       → no status filter
 */
const guestFilterToQuery = (filter) => {
  if (filter === 'attended') return { status: GUEST_STATUS.CHECKED_IN };
  if (filter === 'confirmed') {
    return { status: { $in: [GUEST_STATUS.CONFIRMED, GUEST_STATUS.CHECKED_IN] } };
  }
  return {};
};

class PostEventService {
  // ============================================
  // HOST READ
  // ============================================

  /**
   * Get post-event content for an event (host or guest view).
   * Reads event + content in parallel. Authorization is scoped via
   * `buildScopedEventQuery` so admins / moderators can view the content
   * for any event, not just the event owner.
   */
  async getPostEventContent(eventId, user) {
    const [event, content] = await Promise.all([
      Event.findOne(buildScopedEventQuery(eventId, user))
        .select('eventDetails status visualTemplate host')
        .populate('host', 'name username'),
      PostEventContent.findOne({ event: eventId })
        .populate('host', 'name username')
        .populate('taqnyatTemplate.templateRef')
        .lean(),
    ]);

    if (!event) {
      throw new NotFoundError('Event');
    }

    // Hydrate guest names for post-level likes + comments so the host's
    // published view can render the real liker list and comment thread
    // (the same post the guest sees). The lean doc carries only guest
    // ObjectIds on these sub-arrays.
    if (content) {
      const likeGuestIds = (content.likes || []).map((l) => l.guest);
      const commentGuestIds = (content.comments || []).map((c) => c.guest);
      const allIds = [...likeGuestIds, ...commentGuestIds].filter(Boolean);

      let nameMap = new Map();
      if (allIds.length) {
        const guests = await Guest.find({ _id: { $in: allIds } })
          .select('name')
          .lean();
        nameMap = new Map(guests.map((g) => [g._id.toString(), g.name]));
      }
      const nameOf = (id) => nameMap.get(id?.toString()) || 'Guest';

      content.likes = (content.likes || []).map((l) => ({
        _id: l._id,
        guest: { _id: l.guest, name: nameOf(l.guest) },
        likedAt: l.likedAt,
      }));
      content.comments = (content.comments || [])
        .filter((c) => !c.isHidden)
        .map((c) => ({
          _id: c._id,
          guest: { _id: c.guest, name: nameOf(c.guest) },
          text: c.text,
          images: c.images,
          createdAt: c.createdAt,
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      content.likesCount = content.likes.length;
      content.commentsCount = content.comments.length;
    }

    return {
      eventId: event._id,
      eventTitle: event.eventDetails?.title,
      event,
      thankYouMessage: content
        ? { text: content.title || '', textAr: content.titleAr || '' }
        : { text: '', textAr: '' },
      content: content || {
        media: [],
        taqnyatTemplate: { templateRef: null },
        settings: { isPublished: false },
      },
    };
  }

  /**
   * Guest-facing read of published post-event content. Uses the model's
   * `getForGuest` static — which filters to published content, increments
   * view/visitor stats, strips raw like/comment arrays, and returns
   * post-level `userLiked` / `likesCount` / `commentsCount` plus the caption
   * (`title`) and a clean media gallery.
   *
   * NOTE: This replaces the previous (broken) path where the guest route ran
   * through `getPostEventContent` with a bare guestId string, which threw a
   * ForbiddenError in `buildScopedEventQuery`.
   */
  async getGuestContent(eventId, guestId) {
    const content = await PostEventContent.getForGuest(eventId, guestId);
    if (!content) {
      throw new NotFoundError('No published content available');
    }
    return content;
  }

  // ============================================
  // HOST: MEDIA (unified photo + video)
  // ============================================

  /**
   * Upload one or more media files (photos and/or videos) to post-event
   * content. Distinguishes type by MIME prefix.
   *
   * The PostEventContent `host` field captures the canonical event owner
   * (not the actor) so admins acting on behalf of a host don't overwrite
   * ownership.
   */
  async uploadMedia(eventId, files, user) {
    if (!files?.length) throw new ValidationError('No files uploaded');

    const event = await Event.findOne(buildScopedEventQuery(eventId, user));
    if (!event) throw new NotFoundError('Event');

    const actorId = user?._id?.toString?.() || user?._id;
    let content = await PostEventContent.findOne({ event: eventId });
    if (!content) {
      content = await PostEventContent.createForEvent(eventId, event.host);
    }

    const added = [];
    for (const file of files) {
      const isVideo = (file.mimetype || '').startsWith('video/');
      const isImage = (file.mimetype || '').startsWith('image/');
      if (!isVideo && !isImage) {
        throw new ValidationError(`Unsupported file type: ${file.mimetype}`);
      }
      const item = await content.addMedia({
        type: isVideo ? 'video' : 'photo',
        url: file.location || file.path || `/uploads/post-event/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
      });
      added.push(item);
    }

    logAudit({
      action: 'post_event.media_uploaded',
      actor: { _id: actorId },
      targetType: 'event',
      targetId: event._id,
      metadata: {
        contentId: content._id,
        ids: added.map((m) => m._id),
        types: added.map((m) => m.type),
        count: added.length,
      },
    }).catch(() => {});

    return { media: added, addedCount: added.length };
  }

  /**
   * Delete a media item (photo or video) by id.
   */
  async deleteMedia(eventId, mediaId, user) {
    const event = await Event.findOne(buildScopedEventQuery(eventId, user));
    if (!event) throw new NotFoundError('Event');

    const content = await PostEventContent.findOne({ event: eventId });
    if (!content) throw new NotFoundError('Post-event content');

    const item = content.media.id(mediaId);
    if (!item) throw new NotFoundError('Media');
    const type = item.type;

    const removed = await content.removeMedia(mediaId);
    if (!removed) throw new NotFoundError('Media');

    const actorId = user?._id?.toString?.() || user?._id;
    logAudit({
      action: 'post_event.media_deleted',
      actor: { _id: actorId },
      targetType: 'event',
      targetId: event._id,
      metadata: { contentId: content._id, mediaId, type },
    }).catch(() => {});
  }

  // ============================================
  // HOST: THANK-YOU MESSAGE
  // ============================================

  async updateThankYouMessage(eventId, messageData, user) {
    const event = await Event.findOne(buildScopedEventQuery(eventId, user));
    if (!event) throw new NotFoundError('Event');

    const actorId = user?._id?.toString?.() || user?._id;
    let content = await PostEventContent.findOne({ event: eventId });
    if (!content) {
      content = await PostEventContent.createForEvent(eventId, event.host);
    }

    if (messageData.text !== undefined) content.title = messageData.text;
    if (messageData.textAr !== undefined) content.titleAr = messageData.textAr;
    if (messageData.description !== undefined) content.description = messageData.description;
    if (messageData.descriptionAr !== undefined) content.descriptionAr = messageData.descriptionAr;
    await content.save();

    logAudit({
      action: 'post_event.thank_you_updated',
      actor: { _id: actorId },
      targetType: 'event',
      targetId: event._id,
      metadata: { contentId: content._id },
    }).catch(() => {});

    return {
      thankYouMessage: { text: content.title, textAr: content.titleAr },
      description: content.description,
      descriptionAr: content.descriptionAr,
    };
  }

  // ============================================
  // HOST: MESSAGING TEMPLATE (StepFour-pattern)
  // ============================================

  /**
   * Save the host's chosen Taqnyat WhatsApp template for access-link
   * dispatch. Mirrors `events.settings.service.updateInvitationSettings`
   * for the canonical-only path.
   */
  async updateMessagingTemplate(eventId, { taqnyatTemplateRef }, user) {
    const event = await Event.findOne(buildScopedEventQuery(eventId, user));
    if (!event) throw new NotFoundError('Event');

    const resolvedRef = await resolveTaqnyatTemplateRef(taqnyatTemplateRef);
    if (!resolvedRef) {
      throw new ValidationError('Taqnyat template not found in cache');
    }

    const actorId = user?._id?.toString?.() || user?._id;
    let content = await PostEventContent.findOne({ event: eventId });
    if (!content) {
      content = await PostEventContent.createForEvent(eventId, event.host);
    }

    content.taqnyatTemplate = { templateRef: resolvedRef };
    await content.save();

    logAudit({
      action: 'post_event.messaging_template_updated',
      actor: { _id: actorId },
      targetType: 'event',
      targetId: event._id,
      metadata: { contentId: content._id, templateRef: resolvedRef },
    }).catch(() => {});

    return {
      taqnyatTemplate: { templateRef: resolvedRef },
    };
  }

  // ============================================
  // HOST: PUBLISH / UNPUBLISH
  // ============================================

  async publishContent(eventId, user) {
    const event = await Event.findOne(buildScopedEventQuery(eventId, user))
      .populate('guestList', 'name phone status')
      .populate('host', 'name username');

    if (!event) throw new NotFoundError('Event');

    const actorId = user?._id?.toString?.() || user?._id;

    const content = await PostEventContent.findOne({ event: eventId })
      .populate('taqnyatTemplate.templateRef');
    if (!content) throw new ValidationError('No post-event content to publish');

    await content.publish();

    // Non-blocking: dispatch access-link messages. Errors are logged but
    // don't fail the publish call.
    dispatchService
      .autoNotifyAfterPublish(event, content)
      .catch((err) => {
        logger.error('[post-event] autoNotifyAfterPublish failed', {
          eventId: event._id.toString(),
          error: err.message,
        });
      });

    logAudit({
      action: 'post_event.published',
      actor: { _id: actorId },
      targetType: 'event',
      targetId: event._id,
      metadata: { contentId: content._id },
    }).catch(() => {});

    return {
      published: true,
      publishedAt: content.settings.publishedAt,
      notifiedGuests: event.guestList?.length || 0,
    };
  }

  /**
   * Publish AND notify guests in one action (the web "Publish & notify"
   * button). Self-contained — composes three already-tested steps:
   *   1. publish the content
   *   2. generate-or-reuse access tokens for the chosen audience
   *      (`sendBulkAccessLinks` only dispatches to *existing* tokens, so on a
   *      fresh event this MUST run first or the send half throws NotFound)
   *   3. dispatch the access links (also persists `stats.lastSend`)
   *
   * Distinct from `publishContent` (which is left untouched for the mobile
   * app): this never triggers the publish-scope auto-notify, so there is no
   * double-send.
   */
  async publishAndNotify(eventId, user, { filter = 'attended', taqnyatTemplateRef } = {}) {
    const event = await Event.findOne(buildScopedEventQuery(eventId, user)).select('_id');
    if (!event) throw new NotFoundError('Event');

    const content = await PostEventContent.findOne({ event: eventId });
    if (!content) throw new ValidationError('No post-event content to publish');

    await content.publish();

    // Notify is best-effort: the publish already succeeded and is durable, so
    // a notify failure (empty audience, deleted template, dispatch error) must
    // NOT roll the host back to the composer. We return `notified: false` so
    // the UI flips to the published view (which surfaces "no links sent yet"),
    // matching the original non-fatal `autoNotifyAfterPublish` semantics.
    try {
      // Step 2 — create or reuse tokens for the audience (must precede send;
      // sendBulkAccessLinks only dispatches to existing tokens).
      await this.generateBulkTokens(eventId, user, { filter });
      // Step 3 — dispatch (persists stats.lastSend).
      const sendResult = await dispatchService.sendBulkAccessLinks(eventId, user, {
        filter,
        taqnyatTemplateRef,
      });
      return {
        published: true,
        publishedAt: content.settings.publishedAt,
        notified: true,
        ...sendResult,
      };
    } catch (err) {
      logger.warn('[post-event] publishAndNotify: published but notify failed', {
        eventId: String(eventId),
        reason: err.body?.reason,
        error: err.message,
      });
      return {
        published: true,
        publishedAt: content.settings.publishedAt,
        notified: false,
        notifyReason: err.body?.reason || 'send_failed',
        sent: 0,
        channelBreakdown: { whatsapp: 0, sms: 0, failed: 0 },
      };
    }
  }

  async unpublishContent(eventId, user) {
    const event = await Event.findOne(buildScopedEventQuery(eventId, user)).select('_id');
    if (!event) throw new NotFoundError('Event');

    const content = await PostEventContent.findOne({ event: eventId });
    if (!content) throw new NotFoundError('Post-event content');
    if (!content.settings?.isPublished) throw new ValidationError('Content is not published');

    content.settings.isPublished = false;
    await content.save();

    const actorId = user?._id?.toString?.() || user?._id;
    logAudit({
      action: 'post_event.content_revoked',
      actor: { _id: actorId },
      targetType: 'event',
      targetId: event._id,
      metadata: { contentId: content._id },
    }).catch(() => {});

    return { unpublished: true };
  }

  // ============================================
  // GUEST: TOKEN VALIDATE
  // ============================================

  async validateGuestToken(token) {
    if (!token) throw new ValidationError('Access token is required');

    const validation = await GuestAccessToken.validateToken(token, {});
    if (!validation.valid) {
      // Rotated / revoked / expired tokens surface as 410 Gone with a
      // structured `reason` in `err.body`. globalErrorHandler bubbles the
      // body fields into the JSON response so the frontend can pick the
      // localised message. Plain unknown-token (lookup miss) stays 403
      // since it's a credential error, not a "the resource is gone" error.
      const goneReasons = ['qr_rotated', 'qr_revoked', 'qr_expired'];
      if (goneReasons.includes(validation.reason)) {
        const err = new AppError(
          validation.message || validation.reason,
          410,
          validation.reason.toUpperCase()
        );
        err.body = { reason: validation.reason, message: validation.message };
        throw err;
      }
      throw new ForbiddenError(validation.message || validation.reason || 'Invalid token');
    }

    const { guest, event } = validation;

    const content = await PostEventContent.findOne({
      event: event._id,
      'settings.isPublished': true,
    });

    if (!content) {
      throw new NotFoundError('No published content available');
    }

    const sessionToken = jwt.sign(
      {
        type: 'guest_session',
        guestId: guest._id,
        eventId: event._id,
        guestName: guest.name,
      },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    return {
      valid: true,
      guest: { _id: guest._id, name: guest.name },
      event: { _id: event._id, title: event.eventDetails?.title },
      sessionToken,
    };
  }

  // ============================================
  // GUEST: LIKE / COMMENT
  // ============================================

  async toggleLike(eventId, mediaId, guestUser) {
    const content = await PostEventContent.findOne({
      event: eventId,
      'settings.isPublished': true,
    });
    if (!content) throw new NotFoundError('Content not found');

    return content.toggleLike(mediaId, guestUser.guestId);
  }

  async addComment(eventId, mediaId, body, files, guestUser) {
    const content = await PostEventContent.findOne({
      event: eventId,
      'settings.isPublished': true,
    });
    if (!content) throw new NotFoundError('Content not found');

    if (!body.text?.trim()) throw new ValidationError('Comment text is required');

    const commentData = {
      text: body.text.trim(),
      images: (files || []).map((f) => ({ url: f.location || f.path })),
      // When `requireApproval` is enabled, hide the comment until the host
      // reviews it.
      ...(content.settings?.requireApproval && { isHidden: true, pendingApproval: true }),
    };

    const comment = await content.addComment(mediaId, guestUser.guestId, commentData);

    return {
      comment: {
        _id: comment._id,
        guest: { _id: guestUser.guestId, name: guestUser.guestName },
        text: comment.text,
        images: comment.images,
        createdAt: comment.createdAt,
      },
      commentsCount: content.media.id(mediaId)?.comments?.length || 0,
    };
  }

  async getComments(eventId, mediaId, { page = 1, limit = 20 }) {
    const content = await PostEventContent.findOne({
      event: eventId,
      'settings.isPublished': true,
    });
    if (!content) throw new NotFoundError('Content not found');

    const item = content.media.id(mediaId);
    if (!item) throw new NotFoundError('Media not found');

    const visible = (item.comments || []).filter((c) => !c.isHidden);
    const total = visible.length;
    const skip = (page - 1) * limit;
    const paginated = visible
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + limit);

    const guestIds = paginated.map((c) => c.guest);
    const guests = await Guest.find({ _id: { $in: guestIds } }).select('name').lean();
    const guestMap = new Map(guests.map((g) => [g._id.toString(), g.name]));

    return {
      comments: paginated.map((c) => ({
        _id: c._id,
        guest: { _id: c.guest, name: guestMap.get(c.guest?.toString()) || 'Guest' },
        text: c.text,
        images: c.images,
        createdAt: c.createdAt,
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalComments: total,
      },
    };
  }

  // ============================================
  // GUEST: POST-LEVEL LIKE / COMMENT (one post per event)
  // ============================================

  async togglePostLike(eventId, guestUser) {
    const content = await PostEventContent.findOne({
      event: eventId,
      'settings.isPublished': true,
    });
    if (!content) throw new NotFoundError('Content not found');

    return content.togglePostLike(guestUser.guestId);
  }

  async addPostComment(eventId, body, files, guestUser) {
    const content = await PostEventContent.findOne({
      event: eventId,
      'settings.isPublished': true,
    });
    if (!content) throw new NotFoundError('Content not found');

    const text = (body.text || '').trim();
    const images = (files || []).map((f) => ({ url: f.location || f.path }));
    // A comment must carry text and/or at least one image.
    if (!text && images.length === 0) {
      throw new ValidationError('Comment must include text or an image');
    }

    const commentData = {
      text,
      images,
      // When `requireApproval` is enabled, hide the comment until the host
      // reviews it.
      ...(content.settings?.requireApproval && { isHidden: true, pendingApproval: true }),
    };

    const comment = await content.addPostComment(guestUser.guestId, commentData);

    return {
      comment: {
        _id: comment._id,
        guest: { _id: guestUser.guestId, name: guestUser.guestName },
        text: comment.text,
        images: comment.images,
        createdAt: comment.createdAt,
      },
      pendingApproval: !!comment.pendingApproval,
      commentsCount: content.comments.filter((c) => !c.isHidden).length,
    };
  }

  async getPostComments(eventId, { page = 1, limit = 20 }) {
    const content = await PostEventContent.findOne({
      event: eventId,
      'settings.isPublished': true,
    });
    if (!content) throw new NotFoundError('Content not found');

    const visible = (content.comments || []).filter((c) => !c.isHidden);
    const total = visible.length;
    const skip = (page - 1) * limit;
    const paginated = visible
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + limit);

    const guestIds = paginated.map((c) => c.guest);
    const guests = await Guest.find({ _id: { $in: guestIds } }).select('name').lean();
    const guestMap = new Map(guests.map((g) => [g._id.toString(), g.name]));

    return {
      comments: paginated.map((c) => ({
        _id: c._id,
        guest: { _id: c.guest, name: guestMap.get(c.guest?.toString()) || 'Guest' },
        text: c.text,
        images: c.images,
        createdAt: c.createdAt,
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalComments: total,
      },
    };
  }

  // ============================================
  // HOST: BULK TOKEN GENERATION
  // ============================================

  async generateBulkTokens(eventId, user, { guestIds, filter = 'attended' }) {
    const event = await Event.findOne(buildScopedEventQuery(eventId, user));
    if (!event) throw new NotFoundError('Event');

    const actorId = user?._id?.toString?.() || user?._id;

    let guests;
    if (guestIds?.length) {
      guests = await Guest.find({ _id: { $in: guestIds }, event: eventId });
    } else {
      guests = await Guest.find({ event: eventId, ...guestFilterToQuery(filter) });
    }

    if (!guests?.length) throw new NotFoundError('No guests found');

    const tokens = [];
    const errors = [];

    const batched = await runBatched(
      guests,
      async (guest) => {
        const tokenDoc = await GuestAccessToken.createForGuest(
          guest._id,
          eventId,
          'post_event',
          30
        );
        return {
          guestId: guest._id,
          guestName: guest.name,
          token: tokenDoc.token,
          accessLink: dispatchService.buildAccessLink(tokenDoc.token),
          expiresAt: tokenDoc.expiresAt,
        };
      },
      { concurrency: 5, ratePerSecond: 10 }
    );

    for (const r of batched.results) {
      if (r.ok) {
        tokens.push(r.value);
      } else {
        errors.push({
          guestId: r.item._id,
          guestName: r.item.name,
          error: r.error,
        });
      }
    }

    logAudit({
      action: 'post_event.tokens_generated',
      actor: { _id: actorId },
      targetType: 'event',
      targetId: event._id,
      metadata: { count: tokens.length, filter, failed: errors.length },
    }).catch(() => {});

    return {
      tokens,
      errors,
      summary: {
        total: guests.length,
        generated: tokens.length,
        failed: errors.length,
      },
    };
  }

  // ============================================
  // HOST: BULK ACCESS-LINK DISPATCH (delegates to dispatchService)
  // ============================================

  async sendBulkAccessLinks(eventId, user, body) {
    return dispatchService.sendBulkAccessLinks(eventId, user, body);
  }
}

const postEventService = new PostEventService();
// Expose the helper on the singleton so callers (e.g.
// `post-event.dispatch.service`) can reuse the exact scope rules
// without recreating their own role map.
postEventService.buildScopedEventQuery = buildScopedEventQuery;
module.exports = postEventService;
