/**
 * Post-Event Content Service
 * Business logic for post-event content management (photos, videos, thank you messages)
 * @module modules/post-event/post-event.service
 */

const config = require('../../config');
const { NotFoundError, ForbiddenError, ValidationError } = require('../../shared/errors');
const jwt = require('jsonwebtoken');

const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');
const GuestAccessToken = require('../../../models/GuestAccessTokenModel');
const PostEventContent = require('../../../models/PostEventContentModel');

const notificationService = require('../notifications/notifications.service');
const taqnyat = require('../../infrastructure/taqnyat');
const { runBatched } = require('../../shared/utils/runBatched');
const { withIdempotency } = require('../../shared/utils/idempotency');
const { logAudit } = require('../../shared/utils/auditLog');

class PostEventService {
  /**
   * Get post-event content for an event (host view)
   */
  async getPostEventContent(eventId, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId })
      .select('eventDetails status');

    if (!event) {
      throw new NotFoundError('Event');
    }

    const content = await PostEventContent.findOne({ event: eventId })
      .populate('host', 'name username')
      .lean();

    return {
      eventId: event._id,
      eventTitle: event.eventDetails?.title,
      content: content || { posts: [], settings: { isPublished: false } },
    };
  }

  /**
   * Upload photos to post-event content
   */
  async uploadPhotos(eventId, files, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError('Event');

    let content = await PostEventContent.findOne({ event: eventId });
    if (!content) {
      content = await PostEventContent.createForEvent(eventId, userId);
    }

    for (const file of files) {
      await content.addPost({
        type: 'photo',
        content: {
          mediaUrl: file.location || file.path || `/uploads/post-event/${file.filename}`,
        },
      });
    }

    // Reload to get updated posts
    content = await PostEventContent.findOne({ event: eventId });
    return {
      photos: content.posts.filter(p => p.type === 'photo'),
      addedCount: files.length,
    };
  }

  /**
   * Upload video to post-event content
   */
  async uploadVideo(eventId, file, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError('Event');

    let content = await PostEventContent.findOne({ event: eventId });
    if (!content) {
      content = await PostEventContent.createForEvent(eventId, userId);
    }

    const updatedContent = await content.addPost({
      type: 'video',
      content: {
        mediaUrl: file.location || file.path || `/uploads/post-event/${file.filename}`,
      },
    });

    const newPost = updatedContent.posts[updatedContent.posts.length - 1];
    return { video: newPost };
  }

  /**
   * Update thank you message / title
   */
  async updateThankYouMessage(eventId, messageData, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError('Event');

    let content = await PostEventContent.findOne({ event: eventId });
    if (!content) {
      content = await PostEventContent.createForEvent(eventId, userId);
    }

    if (messageData.text) content.title = messageData.text;
    if (messageData.textAr) content.titleAr = messageData.textAr;
    if (messageData.description) content.description = messageData.description;
    if (messageData.descriptionAr) content.descriptionAr = messageData.descriptionAr;
    await content.save();

    return { thankYouMessage: { text: content.title, textAr: content.titleAr } };
  }

  /**
   * Delete photo post from post-event content
   */
  async deletePhoto(eventId, photoId, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError('Event');

    const content = await PostEventContent.findOne({ event: eventId });
    if (!content) throw new NotFoundError('Post-event content');

    const post = content.posts.id(photoId);
    if (!post) throw new NotFoundError('Photo');

    post.remove();
    await content.save();
  }

  /**
   * Delete video post from post-event content
   */
  async deleteVideo(eventId, videoId, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError('Event');

    const content = await PostEventContent.findOne({ event: eventId });
    if (!content) throw new NotFoundError('Post-event content');

    const post = content.posts.id(videoId);
    if (!post) throw new NotFoundError('Video');

    post.remove();
    await content.save();
  }

  /**
   * Publish post-event content to guests
   */
  async publishContent(eventId, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId })
      .populate('guestList', 'name phone status');

    if (!event) throw new NotFoundError('Event');

    const content = await PostEventContent.findOne({ event: eventId });
    if (!content) throw new ValidationError('No post-event content to publish');

    await content.publish();

    // Generate tokens and notify guests via WhatsApp/SMS (non-blocking)
    this._generateTokensAndNotify(event, content).catch(console.error);

    // Track-B: audit content publish — targetType:'event' (post_event_content not in enum)
    logAudit({
      action: 'post_event.published',
      actor: { _id: userId },
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
   * Unpublish (revoke) post-event content (FLOW-21 Track-B)
   */
  async unpublishContent(eventId, userId) {
    const event = await Event.findOne({ _id: eventId, host: userId }).select('_id');
    if (!event) throw new NotFoundError('Event');

    const content = await PostEventContent.findOne({ event: eventId });
    if (!content) throw new NotFoundError('Post-event content');
    if (!content.settings?.isPublished) throw new ValidationError('Content is not published');

    content.settings.isPublished = false;
    await content.save();

    logAudit({
      action: 'post_event.content_revoked',
      actor: { _id: userId },
      targetType: 'event',
      targetId: event._id,
      metadata: { contentId: content._id },
    }).catch(() => {});

    return { unpublished: true };
  }

  /**
   * Get published content for guest portal (accessed via invitation code)
   */
  async getPublishedContentForGuest(eventId, guestCode) {
    const guest = await Guest.findOne({
      event: eventId,
      $or: [
        { 'invitation.code': guestCode },
        { qrcode: guestCode },
      ],
    });

    if (!guest) throw new ForbiddenError('Invalid invitation code');

    const content = await PostEventContent.getForGuest(eventId, guest._id);
    if (!content) throw new NotFoundError('No published content available');

    return content;
  }

  // ============================================
  // GUEST INTERACTION METHODS
  // ============================================

  async validateGuestToken(token) {
    if (!token) throw new ValidationError('Access token is required');

    const validation = await GuestAccessToken.validateToken(token, {});
    if (!validation.valid) {
      // Phase 3e.3 / 3e.4 (D7 / D8): rotated / revoked / expired tokens
      // surface as a 410 Gone with the reason in the body. Plain
      // unknown-token (lookup miss) stays 403 since it's a credential
      // error, not a "the resource is gone" error.
      const goneReasons = ['qr_rotated', 'qr_revoked', 'qr_expired'];
      if (goneReasons.includes(validation.reason)) {
        const AppError = require('../../shared/errors/AppError');
        const err = new AppError(
          validation.message || validation.reason,
          410,
          validation.reason.toUpperCase()
        );
        // The controller-level catch maps this to a structured 410 body;
        // even if it doesn't, the global handler returns 410 because
        // AppError sets `statusCode` and `isOperational`.
        err.body = { reason: validation.reason, message: validation.message };
        throw err;
      }
      throw new ForbiddenError(validation.message || validation.reason || 'Invalid token');
    }

    const { guest, event } = validation;

    // Check that post-event content is published for this event
    const content = await PostEventContent.findOne({
      event: event._id,
      'settings.isPublished': true,
    });

    if (!content) {
      throw new NotFoundError('No published content available');
    }

    const sessionToken = jwt.sign(
      { type: 'guest_session', guestId: guest._id, eventId: event._id, guestName: guest.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      valid: true,
      guest: { _id: guest._id, name: guest.name },
      event: { _id: event._id, title: event.eventDetails?.title },
      sessionToken,
    };
  }

  async toggleLike(eventId, postId, guestUser) {
    const content = await PostEventContent.findOne({
      event: eventId,
      'settings.isPublished': true,
    });
    if (!content) throw new NotFoundError('Content not found');

    return content.toggleLike(postId, guestUser.guestId);
  }

  async addComment(eventId, postId, body, files, guestUser) {
    const content = await PostEventContent.findOne({
      event: eventId,
      'settings.isPublished': true,
    });
    if (!content) throw new NotFoundError('Content not found');

    if (!body.text?.trim()) throw new ValidationError('Comment text is required');

    // FLOW-21-F02: enforce requireApproval — hide comment until host reviews
    const commentData = {
      text: body.text.trim(),
      images: (files || []).map(f => ({ url: f.location || f.path })),
      ...(content.settings?.requireApproval && { isHidden: true, pendingApproval: true }),
    };

    const comment = await content.addComment(postId, guestUser.guestId, commentData);

    return {
      comment: {
        _id: comment._id,
        guest: { _id: guestUser.guestId, name: guestUser.guestName },
        text: comment.text,
        images: comment.images,
        createdAt: comment.createdAt,
      },
      commentsCount: content.posts.id(postId)?.comments?.length || 0,
    };
  }

  async getComments(eventId, postId, { page = 1, limit = 20 }) {
    const content = await PostEventContent.findOne({
      event: eventId,
      'settings.isPublished': true,
    });
    if (!content) throw new NotFoundError('Content not found');

    const post = content.posts.id(postId);
    if (!post) throw new NotFoundError('Post not found');

    const visible = (post.comments || []).filter(c => !c.isHidden);
    const total = visible.length;
    const skip = (page - 1) * limit;
    const paginated = visible.sort((a, b) => b.createdAt - a.createdAt).slice(skip, skip + limit);

    const guestIds = paginated.map(c => c.guest);
    const guests = await Guest.find({ _id: { $in: guestIds } }).select('name').lean();
    const guestMap = new Map(guests.map(g => [g._id.toString(), g.name]));

    return {
      comments: paginated.map(c => ({
        _id: c._id,
        guest: { _id: c.guest, name: guestMap.get(c.guest?.toString()) || 'Guest' },
        text: c.text,
        images: c.images,
        createdAt: c.createdAt,
      })),
      pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalComments: total },
    };
  }

  async generateBulkTokens(eventId, userId, { guestIds, filter = 'attended' }) {
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError('Event');

    let guests;
    if (guestIds?.length) {
      guests = await Guest.find({ _id: { $in: guestIds }, event: eventId });
    } else {
      const query = { event: eventId };
      if (filter === 'attended') query.status = 'attended';
      else if (filter === 'confirmed') query.status = { $in: ['confirmed', 'attended'] };
      guests = await Guest.find(query);
    }

    if (!guests?.length) throw new NotFoundError('No guests found');

    const frontendUrl = config.frontend?.url || process.env.FRONTEND_URL;
    const tokens = [];
    const errors = [];

    for (const guest of guests) {
      try {
        // createForGuest returns existing valid token or creates a new one
        const tokenDoc = await GuestAccessToken.createForGuest(guest._id, eventId, 'post_event', 30);
        tokens.push({
          guestId: guest._id,
          guestName: guest.name,
          token: tokenDoc.token,
          accessLink: `${frontendUrl}/ar/post-event?token=${tokenDoc.token}`,
          expiresAt: tokenDoc.expiresAt,
        });
      } catch (err) {
        errors.push({ guestId: guest._id, guestName: guest.name, error: err.message });
      }
    }

    return {
      tokens,
      errors: errors.length ? errors : undefined,
      summary: { total: guests.length, generated: tokens.length, failed: errors.length },
    };
  }

  // FLOW-21-F04: renamed from sendBulkAccessEmails — sends WhatsApp/SMS, not email
  async sendBulkAccessLinks(eventId, userId, { guestIds, filter = 'attended' }) {
    // Sends access links via WhatsApp (with SMS fallback), not email
    const event = await Event.findOne({ _id: eventId, host: userId });
    if (!event) throw new NotFoundError('Event');

    const tokenQuery = { event: eventId, expiresAt: { $gt: new Date() }, isRevoked: false };
    if (guestIds?.length) tokenQuery.guest = { $in: guestIds };

    let tokens = await GuestAccessToken.find(tokenQuery).populate('guest', 'name phone status');

    if (!guestIds && filter !== 'all') {
      const statuses = filter === 'attended' ? ['attended'] : ['confirmed', 'attended'];
      tokens = tokens.filter(t => t.guest && statuses.includes(t.guest.status));
    }

    const reachable = tokens.filter(t => t.guest?.phone);
    if (!reachable.length) throw new NotFoundError('No guests with phone numbers found');

    const frontendUrl = config.frontend?.url || process.env.FRONTEND_URL;
    const SENDER = process.env.TAQNYAT_SENDER_NAME || 'HalaaApp';

    // Phase 3b.3 (FLOW-21-F01): same runBatched + idempotency contract as
    // launch / reminder sends. Two clicks of "send post-event link" within
    // the cache TTL deduplicate against the per-guest key, so guests don't
    // get the same SMS twice.
    const batched = await runBatched(
      reachable,
      (t) => {
        const key = `post_event_access:${eventId}:${t.guest._id}`;
        return withIdempotency(key, async () => {
          const link = `${frontendUrl}/ar/post-event?token=${t.token}`;
          const msg = `شكراً لحضورك! يمكنك مشاهدة صور ومقاطع المناسبة من هنا:\n${link}`;
          await taqnyat.sendSMS(t.guest.phone, msg, { sender: SENDER });
          return { ok: true };
        }, { scope: 'post_event_access', userId });
      },
      { concurrency: 5, ratePerSecond: 10 }
    );

    const sent = batched.results
      .filter(r => r.ok)
      .map(r => ({ guestId: r.item.guest._id, guestName: r.item.guest.name, phone: r.item.guest.phone }));
    const failed = batched.results
      .filter(r => !r.ok)
      .map(r => ({ guestId: r.item.guest._id, phone: r.item.guest.phone, error: r.error }));

    return {
      sent,
      failed: failed.length ? failed : undefined,
      summary: { total: reachable.length, sent: sent.length, failed: failed.length },
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Generate access tokens for all guests and send them their post-event link via SMS.
   * Called non-blocking after publishContent().
   */
  async _generateTokensAndNotify(event, content) {
    const frontendUrl = config.frontend?.url || process.env.FRONTEND_URL || 'https://halaa.sa';
    const SENDER = process.env.TAQNYAT_SENDER_NAME || 'HalaaApp';

    const guests = (event.guestList || []).filter(g => g.phone);

    // Phase 3b.3 (FLOW-21-F01): runBatched + idempotency. Publishing the
    // same post-event content twice (e.g. host clicks "Publish" again
    // after a network blip) doesn't double-SMS guests within the cache
    // window.
    await runBatched(
      guests,
      (guest) => withIdempotency(
        `post_event_publish:${event._id}:${guest._id}`,
        async () => {
          const tokenDoc = await GuestAccessToken.createForGuest(guest._id, event._id, 'post_event', 30);
          const link = `${frontendUrl}/ar/post-event?token=${tokenDoc.token}`;
          const message =
            `${guest.name}، شكراً لحضورك! 🌹\n` +
            `يمكنك مشاهدة صور ومقاطع المناسبة من هنا:\n${link}`;
          await taqnyat.sendSMS(guest.phone, message, { sender: SENDER });
          return { ok: true };
        },
        { scope: 'post_event_publish' }
      ).catch((err) => {
        console.error(`[PostEvent] Failed to notify guest ${guest._id}:`, err.message);
        return { ok: false };
      }),
      { concurrency: 5, ratePerSecond: 10 }
    );

    // Notify the host
    try {
      await notificationService.sendToUser(event.host, {
        type: 'post_event_published',
        title: 'Post-Event Content Published',
        titleAr: 'تم نشر محتوى ما بعد المناسبة',
        message: `Your post-event content for "${event.eventDetails?.title}" has been published to ${guests.length} guests.`,
        messageAr: `تم نشر محتوى ما بعد مناسبة "${event.eventDetails?.title}" لـ ${guests.length} ضيف.`,
        data: { entityType: 'event', entityId: event._id },
      });
    } catch (err) {
      console.error('[PostEvent] Failed to notify host:', err.message);
    }
  }
}

module.exports = new PostEventService();
