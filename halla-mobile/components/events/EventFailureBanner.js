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

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WhatsAppContactButton from '../shared/WhatsAppContactButton';

const MAX_VISIBLE_ATTEMPTS = 5;

export default function EventFailureBanner({ event, currentUser, onRetry }) {
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState(null);

  if (!event) return null;
  const status = event?.status;
  const attemptCount = event?.attemptCount || 0;
  const failureReason = event?.failureReason;
  const eventTitle = event?.eventDetails?.title || event?.title || '';
  const eventId = event?._id || event?.id;

  if (status === 'scheduled' && attemptCount > 0 && !event?.launchedAt) {
    return (
      <View style={[styles.banner, styles.retrying]}>
        <Text style={styles.title}>نُعيد محاولة إطلاق مناسبتك...</Text>
        <Text style={styles.message}>
          محاولة {attemptCount} من {MAX_VISIBLE_ATTEMPTS}. سنحاول مجدداً تلقائياً.
        </Text>
      </View>
    );
  }

  if (status !== 'failed') return null;

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
      <View style={styles.titleRow}>
        <Ionicons name="alert-circle" size={20} color="#6a1212" />
        <Text style={styles.title}>نعتذر — تعذّر إطلاق مناسبتك</Text>
      </View>
      <Text style={styles.message}>
        لم نتمكن من إرسال الدعوات لمناسبتك. سنبذل كل جهد لمساعدتك على إطلاقها.
      </Text>
      {failureReason ? (
        <View style={styles.reason}>
          <Text style={styles.reasonText}>سبب الفشل: {failureReason}</Text>
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
              {retrying ? 'جارٍ إعادة المحاولة...' : 'إعادة محاولة الإطلاق'}
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6a1212',
    marginBottom: 6,
    textAlign: 'right',
  },
  message: {
    fontSize: 13,
    color: '#6a1212',
    lineHeight: 20,
    textAlign: 'right',
  },
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
