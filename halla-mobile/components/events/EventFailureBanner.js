/**
 * EventFailureBanner — mobile (Phase 3c.5).
 *
 * Mirrors `labbe/app/[lang]/host/events/[id]/_components/EventFailureBanner.jsx`.
 * Renders a "we're sorry" banner when the event status is `failed`, plus a
 * softer "we're retrying" announcement for `scheduled` events that have
 * already burned at least one launch attempt.
 *
 * Mobile event-detail rendering verification (per the prompt §5.5):
 *   - The mobile `EventDetails` screen exists (`components/events/EventDetails.js`)
 *     and is reachable via `EventsScreen.js` → `details` view.
 *   - Step 3, 4, 5 of the mobile create-event wizard, the WhatsApp preview,
 *     and template selection are NOT verified in this banner; that's
 *     Phase 4 (mobile parity). Banner only requires the detail screen to
 *     render, which it does.
 *
 * The retry button uses `eventsService2.retryLaunch` (added alongside).
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WhatsAppContactButton from '../shared/WhatsAppContactButton';
// L-8: shared status constant prevents typo-drift with backend.
import { EVENT_STATUS } from '../../utils/constants/eventStatus';

const MAX_VISIBLE_ATTEMPTS = 5;

// M-20: mirrors LAUNCH_BACKOFF_MS in scheduledTasks.js (after L-7 trim).
// Duplicated to avoid pulling server-only code into the RN bundle.
const RETRY_BACKOFF_MS = [
  5 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
  6 * 60 * 60 * 1000,
];

const formatCountdown = (ms) => {
  if (ms <= 0) return null;
  const totalSec = Math.ceil(ms / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const parts = [];
  if (hh > 0) parts.push(`${hh}h`);
  parts.push(`${mm.toString().padStart(2, '0')}m`);
  parts.push(`${ss.toString().padStart(2, '0')}s`);
  return parts.join(' ');
};

export default function EventFailureBanner({ event, currentUser, onRetry, lang = 'ar' }) {
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState(null);
  const [, setTick] = useState(0);
  const isRtl = lang !== 'en';

  // Tick the countdown every second while we're in the retrying state.
  useEffect(() => {
    if (!event || event.status !== EVENT_STATUS.SCHEDULED) return undefined;
    const handle = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(handle);
  }, [event?.status, event?.lastAttemptAt]);

  if (!event) return null;
  const status = event?.status;
  const attemptCount = event?.attemptCount || 0;
  const failureReason = event?.failureReason;
  const eventTitle = event?.eventDetails?.title || event?.title || '';
  const eventId = event?._id || event?.id;
  const lastAttemptAt = event?.lastAttemptAt
    ? new Date(event.lastAttemptAt).getTime()
    : null;

  if (status === EVENT_STATUS.SCHEDULED && attemptCount > 0 && !event?.launchedAt) {
    // M-20: countdown to next attempt — derived the same way as the web
    // banner, with English fallback when lang === 'en'.
    const backoff =
      RETRY_BACKOFF_MS[Math.min(attemptCount - 1, RETRY_BACKOFF_MS.length - 1)] || 0;
    const nextAt = lastAttemptAt ? lastAttemptAt + backoff : null;
    const countdownMs = nextAt ? nextAt - Date.now() : 0;
    const countdownStr = formatCountdown(countdownMs);

    return (
      <View style={[styles.banner, styles.retrying]}>
        <Text style={[styles.title, !isRtl && styles.titleLtr]}>
          {isRtl ? 'نُعيد محاولة إطلاق مناسبتك...' : 'Retrying your event launch...'}
        </Text>
        <Text style={[styles.message, !isRtl && styles.messageLtr]}>
          {isRtl
            ? `محاولة ${attemptCount} من ${MAX_VISIBLE_ATTEMPTS}. سنحاول مجدداً تلقائياً.`
            : `Attempt ${attemptCount} of ${MAX_VISIBLE_ATTEMPTS}. We'll retry automatically.`}
          {countdownStr && countdownMs > 0
            ? isRtl
              ? ` المحاولة التالية خلال ${countdownStr}.`
              : ` Next attempt in ${countdownStr}.`
            : ''}
        </Text>
      </View>
    );
  }

  if (status !== EVENT_STATUS.FAILED) return null;

  const userRole = currentUser?.role;
  const userId = currentUser?._id || currentUser?.id;
  const userWhitelabelId = currentUser?.whitelabelId;
  const eventWhitelabelId = event?.whitelabelId;
  const eventHostId = event?.host?._id || event?.host;
  const canRetry =
    eventHostId?.toString?.() === userId?.toString?.() ||
    userRole === 'admin' ||
    userRole === 'super_admin' ||
    (userRole === 'whitelabel_admin' &&
      eventWhitelabelId &&
      userWhitelabelId &&
      eventWhitelabelId.toString() === userWhitelabelId.toString());

  const handleRetry = async () => {
    if (!onRetry) {
      Alert.alert('غير متاح', 'إعادة المحاولة غير متاحة في هذه الشاشة');
      return;
    }
    setRetrying(true);
    setError(null);
    try {
      await onRetry(eventId);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'تعذّر إطلاق المناسبة. حاول مرة أخرى.';
      setError(msg);
    } finally {
      setRetrying(false);
    }
  };

  const contextMessage =
    `أحتاج للمساعدة في مناسبتي "${eventTitle}" (Event ID: ${eventId})` +
    (failureReason ? ` — السبب: ${failureReason}` : '');

  return (
    <View style={[styles.banner, styles.failed]}>
      <View style={[styles.titleRow, !isRtl && styles.titleRowLtr]}>
        <Ionicons name="alert-circle" size={20} color="#6a1212" />
        <Text style={[styles.title, !isRtl && styles.titleLtr]}>
          {isRtl
            ? 'نعتذر — تعذّر إطلاق مناسبتك'
            : "We're sorry — your event couldn't launch"}
        </Text>
      </View>
      <Text style={[styles.message, !isRtl && styles.messageLtr]}>
        {isRtl
          ? 'لم نتمكن من إرسال الدعوات لمناسبتك. سنبذل كل جهد لمساعدتك على إطلاقها.'
          : "We couldn't send your invitations. We'll do our best to help you launch."}
      </Text>
      {failureReason ? (
        <View style={styles.reason}>
          <Text style={[styles.reasonText, !isRtl && styles.messageLtr]}>
            {isRtl ? 'سبب الفشل: ' : 'Reason: '}
            {failureReason}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {canRetry ? (
          <TouchableOpacity
            style={[styles.retryButton, retrying && styles.retryDisabled]}
            disabled={retrying}
            onPress={handleRetry}
            activeOpacity={0.85}
            testID="retry-launch-button"
          >
            <Text style={styles.retryButtonText}>
              {retrying
                ? isRtl
                  ? 'جارٍ إعادة المحاولة...'
                  : 'Retrying...'
                : isRtl
                  ? 'إعادة محاولة الإطلاق'
                  : 'Retry launch'}
            </Text>
          </TouchableOpacity>
        ) : null}
        <WhatsAppContactButton contextMessage={contextMessage} />
      </View>

      {error ? <Text style={[styles.error, !isRtl && styles.messageLtr]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
    marginHorizontal: 12,
  },
  failed: {
    backgroundColor: '#fff4f4',
    borderColor: '#f1b6b6',
    borderWidth: 1,
  },
  retrying: {
    backgroundColor: '#fffbe6',
    borderColor: '#f3d97f',
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  titleRowLtr: { flexDirection: 'row' },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6a1212',
    marginBottom: 6,
    textAlign: 'right',
  },
  titleLtr: { textAlign: 'left' },
  message: {
    fontSize: 13,
    color: '#6a1212',
    lineHeight: 20,
    textAlign: 'right',
  },
  messageLtr: { textAlign: 'left' },
  reason: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  reasonText: {
    fontSize: 12,
    color: '#6a1212',
    textAlign: 'right',
  },
  actions: {
    marginTop: 12,
    flexDirection: 'column',
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#b91c1c',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryDisabled: { backgroundColor: '#c87c7c' },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  error: {
    marginTop: 8,
    fontSize: 12,
    color: '#6a1212',
    textAlign: 'right',
  },
});
