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
 * The retry button uses the `useRetryLaunch` hook from
 * `hooks/events/mutations/useEventMutation.js`.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WhatsAppContactButton from '../shared/WhatsAppContactButton';
import { EVENT_STATUS } from '@halla/shared/constants/eventStatus';
import { useTranslation } from '../../localization/hooks/useTranslation';

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

export default function EventFailureBanner({ event, currentUser, onRetry }) {
  const { t } = useTranslation('events');
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState(null);
  const [, setTick] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;

  // Tick the countdown every second while we're in the retrying state.
  useEffect(() => {
    if (!event || event.status !== EVENT_STATUS.SCHEDULED) return undefined;
    const handle = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(handle);
  }, [event?.status, event?.lastAttemptAt]);

  // Spin loop for the retrying icon — runs only while the banner is visible.
  useEffect(() => {
    if (!event || event.status !== EVENT_STATUS.SCHEDULED) return undefined;
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [event?.status, spin]);

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

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
        <View style={styles.topStripe} />
        <View style={styles.titleRow}>
          <View style={[styles.iconWrap, styles.iconWrapRetrying]}>
            <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
              <Ionicons name="sync" size={20} color="#965c00" />
            </Animated.View>
          </View>
          <Text
            style={[styles.title, styles.titleRetrying]}
            numberOfLines={2}
          >
            {t('failureBanner.retrying.title')}
          </Text>
        </View>

        <Text style={[styles.message, styles.messageRetrying]}>
          {t('failureBanner.retrying.attemptCount', { attempt: attemptCount, max: MAX_VISIBLE_ATTEMPTS })}
        </Text>

        <View style={styles.progress}>
          {Array.from({ length: MAX_VISIBLE_ATTEMPTS }).map((_, i) => {
            const idx = i + 1;
            const isPast = idx < attemptCount;
            const isCurrent = idx === attemptCount;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  (isPast || isCurrent) && styles.dotActive,
                  isCurrent && styles.dotCurrent,
                ]}
              />
            );
          })}
        </View>

        {countdownStr && countdownMs > 0 ? (
          <View style={styles.countdownPill}>
            <View style={styles.countdownDot} />
            <Text style={styles.countdownText}>
              {t('failureBanner.retrying.nextAttempt', { countdown: countdownStr })}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  if (status !== EVENT_STATUS.FAILED) return null;

  const userRole = currentUser?.role;
  const userId = currentUser?._id || currentUser?.id;
  const eventHostId = event?.host?._id || event?.host;
  const canRetry =
    eventHostId?.toString?.() === userId?.toString?.() ||
    userRole === 'admin' ||
    userRole === 'super_admin';

  const handleRetry = async () => {
    if (!onRetry) {
      Alert.alert(t('failureBanner.retryUnavailableTitle'), t('failureBanner.retryNotAvailable'));
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
      <View style={[styles.topStripe, styles.topStripeFailed]} />
      <View style={styles.titleRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle" size={20} color="#88281f" />
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {t('failureBanner.failed.title')}
        </Text>
      </View>
      <Text style={styles.message}>
        {t('failureBanner.failed.message')}
      </Text>
      {failureReason ? (
        <View style={styles.reason}>
          <Text style={styles.reasonText}>
            {t('failureBanner.failed.reason')}{failureReason}
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
                ? t('failureBanner.retryButton.retrying')
                : t('failureBanner.retryButton.idle')}
            </Text>
          </TouchableOpacity>
        ) : null}
        <WhatsAppContactButton contextMessage={contextMessage} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 18,
    paddingTop: 22,
    borderRadius: 16,
    marginVertical: 12,
    marginHorizontal: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  topStripe: {
    position: 'absolute',
    top: 0,
    insetInlineStart: 0,
    insetInlineEnd: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#dc9b33',
  },
  topStripeFailed: { backgroundColor: '#af3427' },
  failed: {
    backgroundColor: '#fdf2f1',
    borderColor: '#ebc2bd',
  },
  retrying: {
    backgroundColor: '#fbf3e6',
    borderColor: '#f1d8b0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ebc2bd',
  },
  iconWrapRetrying: { backgroundColor: '#f1d8b0' },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#6a1f18',
    fontFamily: 'Cairo_700Bold',
  },
  titleRetrying: { color: '#593700' },
  message: {
    fontSize: 13,
    color: '#88281f',
    lineHeight: 20,
    marginTop: 10,
    fontFamily: 'Cairo_400Regular',
  },
  messageRetrying: { color: '#744800' },

  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f1d8b0',
    borderWidth: 1,
    borderColor: '#ebc68a',
  },
  dotActive: {
    backgroundColor: '#d38200',
    borderColor: '#d38200',
  },
  dotCurrent: {
    transform: [{ scale: 1.2 }],
  },

  countdownPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderColor: '#ebc68a',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 12,
  },
  countdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d38200',
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#744800',
    fontVariant: ['tabular-nums'],
    fontFamily: 'Cairo_600SemiBold',
  },

  reason: {
    backgroundColor: '#ffffff',
    borderColor: '#ebc2bd',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  reasonText: {
    fontSize: 12,
    color: '#6a1f18',
  },
  actions: {
    marginTop: 14,
    flexDirection: 'column',
    gap: 10,
  },
  retryButton: {
    backgroundColor: '#af3427',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  retryDisabled: { backgroundColor: '#d57a71' },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
  },
  error: {
    marginTop: 8,
    fontSize: 12,
    color: '#6a1f18',
    backgroundColor: '#ffffff',
    borderColor: '#ebc2bd',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
