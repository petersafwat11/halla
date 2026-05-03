/**
 * Messaging Service
 * Business logic for sending SMS and WhatsApp messages
 * @module modules/messaging/messaging.service
 */

const taqnyat = require('../../infrastructure/taqnyat');
const { normalizePhoneNumber } = require('../../shared/utils/phone');
const Event = require('../../../models/EventModel');
const Guest = require('../../../models/GuestModel');
const config = require('../../config');
const notificationService = require('../../shared/utils/notificationService');
const { runBatched } = require('../../shared/utils/runBatched');
const { withIdempotency } = require('../../shared/utils/idempotency');
const { parseEventTime } = require('../../shared/utils/timezone');
const AppError = require('../../shared/errors/AppError');

class MessagingService {
  constructor() {
    this.TAQNYAT_SENDER = process.env.TAQNYAT_SENDER_NAME || 'HalaaApp-AD';
  }

  /** @private */
  async _sendSMS(phoneNumber, message) {
    return taqnyat.sendSMS(phoneNumber, message, { sender: this.TAQNYAT_SENDER });
  }

  /** @private */
  _normalizePhoneNumber(phone) {
    return normalizePhoneNumber(phone);
  }

  /**
   * Build body params for Taqnyat template variables.
   * Variable order: {{1}} guest_name, {{2}} event_name, {{3}} event_date,
   *                 {{4}} event_time, {{5}} event_location
   * @private
   */
  _getEventBodyParams(event, guestName) {
    return [
      guestName || 'ضيفنا الكريم',
      event.eventDetails?.title || 'مناسبة',
      this._formatDate(event.eventDetails?.date),
      event.eventDetails?.time || '',
      event.eventDetails?.location?.address || 'يُحدد لاحقاً',
    ];
  }

  /**
   * Build SMS fallback body text from event data (used when no WhatsApp capability).
   * @private
   */
  _buildSmsBody(event, guestName, rsvpLink) {
    const title = event.eventDetails?.title || 'مناسبة';
    const date = this._formatDate(event.eventDetails?.date);
    const time = event.eventDetails?.time || '';
    const location = event.eventDetails?.location?.address || '';
    const name = guestName ? `${guestName}، ` : '';
    return `${name}أنت مدعو لحضور ${title}\nبتاريخ ${date} الساعة ${time}\n${location}\n${rsvpLink}`;
  }

  /** @private
   * Returns the image URL to use in a template header, BUT ONLY if the
   * selected template actually has an IMAGE header component.
   * Sending a header component for a template that has none causes Taqnyat
   * error code 100 "Invalid or missing parameter".
   */
  _getEventImageUrl(event) {
    // Only inject image header if the stored template metadata says it has one
    const hasImageHeader = event.invitationSettings?.selectedTemplate?.hasImageHeader === true;
    if (!hasImageHeader) return null;

    const imagePath = event.invitationSettings?.templateImage;
    if (!imagePath) return null;
    // S3 URLs are already public
    if (imagePath.startsWith('http')) return imagePath;
    // Local file — WhatsApp API can't reach localhost, use a public fallback
    return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600';
  }

  /**
   * Send test message to verify channel works
   * @param {Object} params
   * @param {string} params.eventId - Event ID
   * @param {string} params.phoneNumber - Test phone number
   * @param {string} params.channel - 'sms' or 'whatsapp'
   * @returns {Promise<Object>}
   */
  async sendTestMessage({ eventId, phoneNumber, channel = 'sms' }) {
    const event = await Event.findById(eventId).populate('host', 'name username');

    if (!event) {
      return { success: false, error: 'EVENT_NOT_FOUND', message: 'Event not found' };
    }

    const rsvpLink = `${config.frontend?.url || 'https://halaa.sa'}/rsvp/test`;

    // Template name comes from the pre-approved Taqnyat template the host selected
    const templateName = event.invitationSettings?.selectedTemplate?.name;

    let result;
    if (channel === 'whatsapp') {
      if (!templateName) {
        return { success: false, error: 'NO_TEMPLATE_SELECTED', message: 'No Taqnyat template selected for this event' };
      }

      const imageUrl = this._getEventImageUrl(event);
      const bodyParams = this._getEventBodyParams(event, 'ضيف تجريبي');

      result = imageUrl
        ? await taqnyat.sendWhatsAppTemplateWithImage(phoneNumber, templateName, 'ar', imageUrl, bodyParams)
        : await taqnyat.sendWhatsAppTemplate(phoneNumber, templateName, 'ar', [
            { type: 'body', parameters: bodyParams.map(p => ({ type: 'text', text: p })) },
          ]);
    } else {
      result = await this._sendSMS(phoneNumber, this._buildSmsBody(event, 'ضيف تجريبي', rsvpLink));
    }

    if (result.success) {
      await Event.findByIdAndUpdate(eventId, {
        testMessageSent: true,
        'messagingStatus.preferredChannel': channel,
      });
    }

    return result;
  }

  /**
   * Send invitation to a single guest
   * @param {Object} params
   * @param {string} params.guestId - Guest ID
   * @param {string} params.eventId - Event ID
   * @param {string} params.channel - 'sms' or 'whatsapp'
   * @returns {Promise<Object>}
   */
  async sendToGuest({ guestId, eventId, channel = 'sms', userId }) {
    const [guest, event] = await Promise.all([
      Guest.findById(guestId),
      Event.findById(eventId).populate('host', 'name username'),
    ]);

    if (!guest) {
      return { success: false, error: 'GUEST_NOT_FOUND', message: 'Guest not found' };
    }

    if (!event) {
      return { success: false, error: 'EVENT_NOT_FOUND', message: 'Event not found' };
    }

    // Verify event ownership
    if (event.host && userId && event.host._id.toString() !== userId.toString()) {
      return { success: false, error: 'FORBIDDEN', message: 'Not authorized for this event' };
    }

    const rsvpLink = `${config.frontend?.url || 'https://halaa.sa'}/rsvp/${eventId}/${guestId}`;

    // Use the pre-approved Taqnyat template name stored at event creation
    const templateName = event.invitationSettings?.selectedTemplate?.name;

    let result;
    if (channel === 'whatsapp') {
      if (!templateName) {
        return { success: false, error: 'NO_TEMPLATE_SELECTED', message: 'No Taqnyat template selected for this event' };
      }

      const imageUrl = this._getEventImageUrl(event);
      const bodyParams = this._getEventBodyParams(event, guest.name);

      // SMS fallback — sent automatically by Taqnyat if recipient has no WhatsApp
      const smsFallback = {
        sender: this.TAQNYAT_SENDER,
        body: this._buildSmsBody(event, guest.name, rsvpLink),
      };

      result = imageUrl
        ? await taqnyat.sendWhatsAppTemplateWithImage(
            guest.phone, templateName, 'ar', imageUrl, bodyParams, smsFallback
          )
        : await taqnyat.sendWhatsAppTemplate(
            guest.phone, templateName, 'ar',
            [{ type: 'body', parameters: bodyParams.map(p => ({ type: 'text', text: p })) }],
            smsFallback
          );
    } else {
      result = await this._sendSMS(guest.phone, this._buildSmsBody(event, guest.name, rsvpLink));
    }

    // Update guest invitation record.
    // effectiveChannel starts equal to the attempted channel.
    // When the Taqnyat webhook fires 'no_capability', the controller updates effectiveChannel → 'sms'.
    const updateData = {
      'invitation.sent': result.success,
      'invitation.method': channel,
      'invitation.effectiveChannel': channel,
      'invitation.status': result.success ? 'sent' : 'failed',
    };

    if (result.success) {
      updateData['invitation.sentAt'] = new Date();
      updateData['invitation.messageId'] = result.messageId;
    } else {
      updateData['invitation.lastError'] = result.error;
    }

    await Guest.findByIdAndUpdate(guestId, updateData);

    return result;
  }

  /**
   * Send invitations to multiple guests (bulk).
   *
   * Phase 3b.1 (FLOW-17-F01): replaces the 100-ms-per-guest serial loop
   * with `runBatched` (concurrency 5, 10/sec cap). For 1000 guests this
   * brings wall-time from ~100 s to roughly 100 s / concurrency (capped
   * by the rate). The cron tick (1 min) plus the 60 s isDue window now
   * comfortably covers events up to a few thousand guests; bigger events
   * will need a higher rate cap negotiated with Taqnyat.
   *
   * Phase 3b.2 (FLOW-14-F04 / FLOW-17-F02): each per-guest send runs
   * inside `withIdempotency(...)`. The key shape uses
   * `lastAttemptAt.getTime()` as the attempt fingerprint — every
   * `runEventLaunch` invocation stamps a fresh `lastAttemptAt` before
   * calling sendBulk, so distinct attempts (cron tick #1, cron retry,
   * manual retry after reset) never collide on the same key. Within
   * an attempt (e.g. two near-simultaneous sendBulk calls under the
   * lock — shouldn't happen, but defense in depth) the keys match and
   * the second call hits the cache.
   *
   * @param {Object} params
   * @param {string[]} params.guestIds
   * @param {string} params.eventId
   * @param {string} params.channel - 'sms' or 'whatsapp'
   * @param {string} [params.userId]
   * @param {string} [params.scope='event_launch']  - one of
   *        'event_launch' | 'reminder' | 'manual_resend' — controls the
   *        idempotency-key namespace.
   * @param {string|number} [params.attemptId] - optional override for the
   *        attempt fingerprint. Used by callers like `retryFailed` that
   *        run outside the runEventLaunch lifecycle and need their own
   *        per-call namespace.
   * @returns {Promise<Object>}
   */
  async sendBulk({
    guestIds,
    eventId,
    channel = 'sms',
    userId,
    scope = 'event_launch',
    attemptId,
  }) {
    const event = await Event.findById(eventId);

    if (!event) {
      return { success: false, error: 'EVENT_NOT_FOUND', message: 'Event not found' };
    }

    // Verify event ownership
    if (event.host && userId && event.host.toString() !== userId.toString()) {
      return { success: false, error: 'FORBIDDEN', message: 'Not authorized for this event' };
    }

    // Update event messaging status
    await Event.findByIdAndUpdate(eventId, {
      'messagingStatus.bulkSendStarted': true,
      'messagingStatus.bulkSendStartedAt': new Date(),
      'messagingStatus.totalMessages': guestIds.length,
      'messagingStatus.sentCount': 0,
      'messagingStatus.failedCount': 0,
      'messagingStatus.pendingCount': guestIds.length,
      'messagingStatus.preferredChannel': channel,
    });

    // Attempt fingerprint priority:
    //   1. explicit `attemptId` from caller (retryFailed)
    //   2. event.lastAttemptAt.getTime() set by runEventLaunch
    //   3. event.attemptCount (legacy fallback)
    //
    // The fingerprint must change between different launch attempts so
    // a cached failure from attempt N doesn't poison attempt N+1.
    const fingerprint =
      attemptId !== undefined && attemptId !== null
        ? attemptId
        : event.lastAttemptAt
        ? new Date(event.lastAttemptAt).getTime()
        : event.attemptCount || 0;

    const batched = await runBatched(
      guestIds,
      async (guestId) => {
        const key = `${scope}:${eventId}:${guestId}:${fingerprint}`;
        return withIdempotency(
          key,
          () => this.sendToGuest({ guestId, eventId, channel }),
          { scope, userId }
        );
      },
      { concurrency: 5, ratePerSecond: 10 }
    );

    const successful = batched.results.filter((r) => r.ok && r.value?.success).length;
    const failed = batched.total - successful;
    const details = batched.results.map((r) => ({
      guestId: r.item,
      ...(r.ok ? r.value : { success: false, error: r.error }),
    }));

    await Event.findByIdAndUpdate(eventId, {
      'messagingStatus.sentCount': successful,
      'messagingStatus.failedCount': failed,
      'messagingStatus.pendingCount': guestIds.length - successful - failed,
      'messagingStatus.bulkSendCompletedAt': new Date(),
    });

    // The bulk operation itself is `success: true` if at least one send
    // succeeded — partial-failure recovery happens via `retryFailed`.
    // It is `success: false` only when *all* sends failed; the cron
    // treats that as a launch-level failure and lets the retry cron
    // re-attempt.
    const overallSuccess = successful > 0;

    return {
      success: overallSuccess,
      total: guestIds.length,
      successful,
      failed,
      details,
      ...(!overallSuccess && { error: 'ALL_SENDS_FAILED', message: 'No invitations were delivered' }),
    };
  }

  /**
   * Retry failed invitations for an event
   * @param {string} eventId - Event ID
   * @param {string} channel - Channel to use for retry
   * @returns {Promise<Object>}
   */
  async retryFailed(eventId, channel = 'sms', userId = null) {
    // Verify event ownership
    if (userId) {
      const event = await Event.findById(eventId);
      if (!event) {
        return { success: false, error: 'EVENT_NOT_FOUND', message: 'Event not found' };
      }
      if (event.host && event.host.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN', message: 'Not authorized for this event' };
      }
    }

    const failedGuests = await Guest.find({
      event: eventId,
      'invitation.status': 'failed',
      $or: [
        { 'invitation.failedAttempts': { $exists: false } },
        { 'invitation.failedAttempts': { $lt: 3 } },
      ],
    });

    if (failedGuests.length === 0) {
      return { success: true, message: 'No failed invitations to retry', retried: 0 };
    }

    // Increment retry count
    await Guest.updateMany(
      { _id: { $in: failedGuests.map(g => g._id) } },
      { $inc: { 'invitation.failedAttempts': 1 } }
    );

    return this.sendBulk({
      guestIds: failedGuests.map(g => g._id.toString()),
      eventId,
      channel,
      // retryFailed runs outside the runEventLaunch lifecycle, so the
      // event's `lastAttemptAt` may still point at the original cron
      // attempt that produced the cached failures. Pass a fresh
      // fingerprint to bust the cache and actually re-send.
      attemptId: `retry_failed:${Date.now()}`,
      scope: 'manual_resend',
    });
  }

  /**
   * Get messaging status for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>}
   */
  async getEventMessagingStatus(eventId, userId = null) {
    const event = await Event.findById(eventId)
      .select('testMessageSent messagingStatus host')
      .lean();

    if (!event) {
      return { success: false, error: 'EVENT_NOT_FOUND' };
    }

    // Verify event ownership
    if (event.host && userId && event.host.toString() !== userId.toString()) {
      return { success: false, error: 'FORBIDDEN', message: 'Not authorized for this event' };
    }

    const guestStats = await Guest.aggregate([
      { $match: { event: event._id } },
      {
        $group: {
          _id: '$invitation.status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      total: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      pending: 0,
    };

    guestStats.forEach(s => {
      stats[s._id] = s.count;
      stats.total += s.count;
    });

    return {
      success: true,
      testMessageSent: event.testMessageSent,
      messagingStatus: event.messagingStatus || {},
      guestStats: stats,
    };
  }

  /**
   * Update delivery status from webhook
   * @param {string} messageId - Message ID
   * @param {string} status - New status (delivered/read/failed)
   * @param {Date} timestamp - Status timestamp
   * @returns {Promise<Object>}
   */
  async updateDeliveryStatus(messageId, status, timestamp) {
    const guest = await Guest.findOne({ 'invitation.messageId': messageId });

    if (!guest) {
      return { success: false, error: 'GUEST_NOT_FOUND' };
    }

    const updateData = { 'invitation.status': status };

    if (status === 'delivered') {
      updateData['invitation.deliveredAt'] = timestamp;
    } else if (status === 'read') {
      updateData['invitation.readAt'] = timestamp;
    }

    await Guest.findByIdAndUpdate(guest._id, updateData);

    return { success: true, guestId: guest._id, status };
  }

  /**
   * Schedule bulk send for a future date/time
   *
   * Sets event launch settings so the cron job picks it up. Phase 3a.5
   * removed the Taqnyat-native SMS scheduling branch entirely: every
   * channel now flows through `scheduleEventLaunch`, which gives us a
   * single retry path, idempotency contract, and lock semantics.
   */
  async scheduleBulkSend({ eventId, scheduledDate, scheduledTime, channel = 'whatsapp' }) {
    const event = await Event.findById(eventId).populate('host', 'name username');
    if (!event) {
      return { success: false, error: 'EVENT_NOT_FOUND', message: 'Event not found' };
    }

    const guests = await Guest.find({ event: eventId, phone: { $exists: true, $ne: null } });
    if (guests.length === 0) {
      return { success: false, error: 'NO_GUESTS', message: 'No guests with phone numbers to send to' };
    }

    // Phase 4b W0-RBAC (D4b-3): backend lower bound on the schedule
    // picker. Reject any schedule whose absolute UTC instant is less
    // than `now + SCHEDULE_MIN_LEAD_HOURS` away. The previous flow only
    // enforced the floor in the client picker, so a crafted POST could
    // queue an event for "in 5 minutes" and bypass the host/admin
    // expectation that hosts have at least 48h to prepare.
    //
    // We reuse `parseEventTime` so the wall-clock interpretation matches
    // the cron's `isDue` check exactly (Asia/Riyadh, UTC+3, no DST).
    const minLeadHours = config?.events?.scheduleMinLeadHours ?? 48;
    const minLeadMs = minLeadHours * 60 * 60 * 1000;
    const scheduledInstant = parseEventTime(
      {
        launchSettings: {
          scheduledDate: new Date(scheduledDate),
          scheduledTime,
        },
      },
      'Asia/Riyadh'
    );
    if (!scheduledInstant) {
      throw new AppError(
        'Invalid scheduledDate or scheduledTime format',
        400,
        'SCHEDULE_INVALID'
      );
    }
    const leadMs = scheduledInstant.getTime() - Date.now();
    if (leadMs < minLeadMs) {
      throw new AppError(
        `Schedule must be at least ${minLeadHours} hours from now.`,
        400,
        'SCHEDULE_TOO_SOON'
      );
    }

    await Event.findByIdAndUpdate(eventId, {
      status: 'scheduled',
      'launchSettings.scheduledDate': new Date(scheduledDate),
      'launchSettings.scheduledTime': scheduledTime,
      'messagingStatus.preferredChannel': channel,
      'messagingStatus.totalMessages': guests.length,
      'messagingStatus.pendingCount': guests.length,
      attemptCount: 0,
      failureReason: null,
    });

    return {
      success: true,
      scheduledDate,
      scheduledTime,
      channel,
      guestCount: guests.length,
    };
  }

  /**
   * Get template status for an event
   */
  async getTemplateStatus(eventId) {
    const event = await Event.findById(eventId)
      .select('testMessageSent invitationSettings.templateImage')
      .lean();

    if (!event) {
      return { success: false, error: 'EVENT_NOT_FOUND' };
    }

    return {
      success: true,
      testMessageSent: event.testMessageSent || false,
      hasTemplateImage: !!event.invitationSettings?.templateImage,
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Format date for messages
   * @private
   */
  _formatDate(date, lang = 'ar') {
    // M-5: explicit Asia/Riyadh time zone via the shared helper. The
    // previous toLocaleDateString relied on the host's TZ, so a UTC
    // server formatted Riyadh-evening events as the prior calendar day.
    if (!date) return '';
    const { formatRiyadh } = require('../../shared/utils/timezone');
    return formatRiyadh(date, {
      style: 'date',
      locale: lang === 'ar' ? 'ar-SA' : 'en-US',
    });
  }

  /**
   * Send reminder to guests who haven't responded
   * @param {Object} params
   * @param {string} params.eventId - Event ID
   * @param {string[]} params.guestIds - Optional specific guest IDs to remind
   * @param {string} params.channel - 'sms' or 'whatsapp'
   * @param {string} params.customMessage - Optional custom reminder message
   * @returns {Promise<Object>}
   */
  async sendReminder({ eventId, guestIds = null, channel = 'sms', customMessage = null, reminderTemplateName = 'halaa_event_reminder_v2' }) {
    const event = await Event.findById(eventId).populate('host', 'name username');

    if (!event) {
      return { success: false, error: 'EVENT_NOT_FOUND', message: 'Event not found' };
    }

    // Build query for pending guests
    const query = {
      event: eventId,
      'invitation.sent': true,
      'invitation.status': { $in: ['sent', 'delivered'] },
      'rsvp.responded': { $ne: true },
    };

    // If specific guest IDs provided, filter by them
    if (guestIds && guestIds.length > 0) {
      query._id = { $in: guestIds };
    }

    const pendingGuests = await Guest.find(query);

    if (pendingGuests.length === 0) {
      return {
        success: true,
        message: 'No pending guests to remind',
        reminded: 0,
      };
    }

    const eventData = {
      title: event.eventDetails?.title || 'Event',
      hostName: event.host?.name || event.host?.username || 'Host',
      date: this._formatDate(event.eventDetails?.date),
    };

    const results = {
      total: pendingGuests.length,
      successful: 0,
      failed: 0,
    };

    for (const guest of pendingGuests) {
      const rsvpLink = `${config.frontend?.url || 'https://halaa.sa'}/rsvp/${eventId}/${guest._id}`;

      const defaultMessage = `تذكير: ${eventData.hostName} بانتظار ردك على دعوة "${eventData.title}". للرد: ${rsvpLink}`;
      const message = customMessage || defaultMessage;

      let result;
      if (channel === 'whatsapp') {
        result = await taqnyat.sendWhatsAppTemplate(
          guest.phone,
          reminderTemplateName,
          'ar',
          [{
            type: 'body',
            parameters: [
              { type: 'text', text: eventData.hostName },
              { type: 'text', text: eventData.title },
              { type: 'text', text: eventData.date },
            ],
          }]
        );
      } else {
        result = await this._sendSMS(guest.phone, message);
      }

      if (result.success) {
        results.successful++;
        await Guest.findByIdAndUpdate(guest._id, {
          'invitation.reminderSentAt': new Date(),
          $inc: { 'invitation.reminderCount': 1 },
        });
      } else {
        results.failed++;
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 200));
    }

    return {
      success: true,
      reminded: results.total,
      successful: results.successful,
      failed: results.failed,
    };
  }

  /**
   * Check SMS balance from Taqnyat
   * @returns {Promise<Object>}
   */
  async checkBalance() {
    try {
      const result = await taqnyat.checkBalance();
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'BALANCE_CHECK_FAILED',
        message: error.message || 'Failed to check balance',
      };
    }
  }

  /**
   * Handle WhatsApp button response (RSVP)
   * @param {Object} params
   * @param {string} params.phoneNumber - Guest phone number
   * @param {string} params.buttonText - Button text clicked (سأحضر/سأعتذر/ربما)
   * @param {string} params.messageId - WhatsApp message ID
   * @returns {Promise<Object>}
   */
  async handleButtonResponse({ phoneNumber, buttonText, messageId }) {
    console.log(`[Messaging] Button response received — phone: ${phoneNumber}, button: ${buttonText}, msgId: ${messageId}`);

    // Normalize the incoming phone number (Meta sends e.g. "966512345678")
    // and also build alternative formats that might be stored in the DB
    const normalized = normalizePhoneNumber(phoneNumber); // e.g. "966512345678"
    const digits = normalized.replace(/\D/g, '');
    const phoneVariants = new Set([phoneNumber, normalized]);
    // Saudi: strip country code to get 9-digit local (5XXXXXXXX)
    if (digits.startsWith('966') && digits.length === 12) {
      phoneVariants.add(digits.slice(3));          // "512345678"
      phoneVariants.add('0' + digits.slice(3));    // "0512345678"
    }

    // Find the guest most recently invited with this phone number.
    // We try all format variants to handle stored vs webhook format mismatches.
    const guest = await Guest.findOne({ phone: { $in: Array.from(phoneVariants) } })
      .sort({ 'invitation.sentAt': -1 })
      .populate('event');

    if (!guest || !guest.event) {
      console.warn(`[Messaging] Guest not found for phone variants: ${Array.from(phoneVariants).join(', ')} — sending default reply`);
      // Still send a default reply so the user gets feedback (e.g. test messages)
      const defaultReply = 'شكراً لردك! لم يتم العثور على بياناتك في النظام.';
      try {
        await taqnyat.sendWhatsAppText(phoneNumber, defaultReply);
      } catch (e) {
        console.error('[Messaging] Failed to send default reply to unknown guest:', e.message);
      }
      return { success: false, error: 'GUEST_NOT_FOUND' };
    }

    const event = guest.event;

    // Map button text to RSVP status
    const statusMap = {
      'سأحضر': 'confirmed',
      'سأعتذر': 'declined',
      'ربما': 'maybe',
    };

    const rsvpStatus = statusMap[buttonText];
    if (!rsvpStatus) {
      return { success: false, error: 'INVALID_BUTTON' };
    }

    // Update guest RSVP
    await Guest.findByIdAndUpdate(guest._id, {
      status: rsvpStatus,
      'rsvp.responded': true,
      'rsvp.respondedAt': new Date(),
    });

    // Notify the host of the RSVP response
    try {
      if (event.host) {
        const statusLabel = rsvpStatus === 'confirmed' ? 'سيحضر ✅' : rsvpStatus === 'declined' ? 'اعتذر ❌' : 'ربما يحضر 🤔';
        await notificationService.sendToUser(event.host, {
          type: 'guest_rsvp',
          title: 'رد ضيف جديد',
          message: `${guest.name} — ${statusLabel}`,
          data: { eventId: event._id, guestId: guest._id, status: rsvpStatus },
        });
      }
    } catch (notifErr) {
      console.error('[Messaging] Failed to notify host of RSVP:', notifErr);
    }

    // Get auto-reply message
    const autoReplyMap = {
      'confirmed': event.invitationSettings?.attendanceAutoReply || 'شكراً لتأكيد حضورك! نتطلع لرؤيتك.',
      'declined': event.invitationSettings?.absenceAutoReply || 'شكراً لإعلامنا. نتمنى لك يوماً سعيداً.',
      'maybe': event.invitationSettings?.expectedAttendanceAutoReply || 'شكراً. نأمل أن نراك بيننا!',
    };

    const replyMessage = autoReplyMap[rsvpStatus];

    // Generate QR code URL for this guest
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(guest.qrcode || guest._id.toString())}&size=300`;

    // Send auto-reply with QR code image.
    // sendWhatsAppImage uses the 24-hour conversation window (session message).
    // If the window has expired, fall back to SMS with the QR link as text.
    try {
      const waResult = await taqnyat.sendWhatsAppImage(phoneNumber, qrCodeUrl, replyMessage);
      if (!waResult.success) {
        throw new Error(waResult.error || 'WA image failed');
      }
    } catch (waErr) {
      console.warn('[Messaging] WhatsApp image send failed, falling back to SMS for QR delivery:', waErr.message);
      await taqnyat.sendSMS(phoneNumber, `${replyMessage}\nرمز الدخول الخاص بك: ${qrCodeUrl}`, {
        sender: this.TAQNYAT_SENDER,
      });
    }

    return { success: true, status: rsvpStatus };
  }

  /**
   * Get approved WhatsApp templates from Taqnyat (for the event creation dropdown)
   * @returns {Promise<Object>}
   */
  async getApprovedTemplates() {
    const result = await taqnyat.getTemplates();
    if (!result.success) {
      return { success: false, templates: [], error: result.error };
    }
    const approved = (result.templates || []).filter(
      t => (t.status || '').toUpperCase() === 'APPROVED'
    );
    return {
      success: true,
      templates: approved.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        language: t.language || 'ar',
        bodyText: t.components?.find(c => c.type === 'BODY')?.text || '',
        // True only when the template definition includes an IMAGE header component.
        // This flag is stored on the event and used at send time to decide whether
        // to include a header component in the Taqnyat payload.
        hasImageHeader: t.components?.some(
          c => c.type === 'HEADER' && c.format === 'IMAGE'
        ) ?? false,
      })),
    };
  }

  /**
   * Get detailed invitation statistics for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>}
   */
  async getDetailedStats(eventId) {
    const event = await Event.findById(eventId);

    if (!event) {
      return { success: false, error: 'EVENT_NOT_FOUND', message: 'Event not found' };
    }

    // Aggregate guest statistics using correct Guest model field paths
    const guestStats = await Guest.aggregate([
      { $match: { event: event._id } },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$invitation.status', count: { $sum: 1 } } },
          ],
          byMethod: [
            { $group: { _id: '$invitation.method', count: { $sum: 1 } } },
          ],
          byRsvp: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                withPhone: {
                  $sum: { $cond: [{ $ifNull: ['$phone', false] }, 1, 0] },
                },
                invitationsSent: {
                  $sum: { $cond: ['$invitation.sent', 1, 0] },
                },
                reminders: { $sum: { $ifNull: ['$invitation.reminderCount', 0] } },
              },
            },
          ],
        },
      },
    ]);

    const stats = guestStats[0];
    const totals = stats.totals[0] || {
      total: 0,
      withPhone: 0,
      invitationsSent: 0,
      reminders: 0,
    };

    // Format status breakdown
    const statusBreakdown = {};
    stats.byStatus.forEach(s => {
      statusBreakdown[s._id || 'pending'] = s.count;
    });

    // Format method breakdown
    const methodBreakdown = {};
    stats.byMethod.forEach(m => {
      methodBreakdown[m._id || 'none'] = m.count;
    });

    // Format RSVP breakdown
    const rsvpBreakdown = {};
    stats.byRsvp.forEach(r => {
      rsvpBreakdown[r._id || 'pending'] = r.count;
    });

    const invitationsSent = totals.invitationsSent;

    // Calculate delivery rate
    const deliveryRate = invitationsSent > 0
      ? ((statusBreakdown.delivered || 0) / invitationsSent * 100).toFixed(2)
      : 0;

    // Calculate response rate (confirmed + declined)
    const responded = (rsvpBreakdown.confirmed || 0) + (rsvpBreakdown.declined || 0);
    const responseRate = invitationsSent > 0
      ? (responded / invitationsSent * 100).toFixed(2)
      : 0;

    // Estimate cost (0.15 SAR per SMS)
    const smsSent = methodBreakdown.sms || 0;
    const estimatedCost = (smsSent * 0.15).toFixed(2);

    return {
      success: true,
      stats: {
        total: totals.total,
        withPhone: totals.withPhone,
        invitationsSent,
        totalReminders: totals.reminders,
        statusBreakdown,
        methodBreakdown,
        rsvpBreakdown,
        metrics: {
          deliveryRate: parseFloat(deliveryRate),
          responseRate: parseFloat(responseRate),
          estimatedCost: parseFloat(estimatedCost),
          currency: 'SAR',
        },
      },
    };
  }
}

module.exports = new MessagingService();
