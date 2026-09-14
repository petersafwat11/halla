import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../localization';
import { useFieldDirection } from '../../hooks/useInputDirection';
import { isolateAuto } from '@halaa/shared/utils/bidi';

export default function ReplyDeliveryPreview({ preview }) {
  const { t } = useTranslation('createEvent');
  const direction = useFieldDirection('localized');
  if (preview.channel === 'none') return null;
  return <View style={styles.preview}>
    <Text style={[styles.heading, direction.text]}>{t(preview.channel === 'portal' ? 'reply_preview_portal' : 'reply_preview_whatsapp')}</Text>
    {preview.includesQr && <View style={styles.qr}>
      <Ionicons name="qr-code-outline" size={44} color="#805b3a" />
      <Text style={[styles.note, direction.text]}>{t('reply_preview_qr_placeholder')}</Text>
    </View>}
    <Text style={styles.message}>{isolateAuto(preview.text)}</Text>
    <Text style={[styles.note, direction.text]}>{t(preview.richCaption ? 'reply_preview_details_note' : preview.channel === 'portal' ? 'reply_preview_portal_note' : 'reply_preview_text_note')}</Text>
  </View>;
}
// Warm palette matching halaa-web/ui/host/replyDeliveryPreview.module.css —
// this block used a cool grey-green that read as foreign next to the gold.
const styles = StyleSheet.create({
  preview: { padding: 16, borderWidth: 1, borderColor: '#ece3d8', borderRadius: 10, backgroundColor: '#faf7f2', gap: 12 },
  heading: { fontFamily: 'Cairo_700Bold', fontSize: 12, letterSpacing: 0.2, color: '#996b40' },
  // The QR stand-in is an illustration, not data: keep it visibly set apart.
  qr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d9c7b1',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  message: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 13,
    lineHeight: 24,
    color: '#3a3028',
    writingDirection: 'auto',
    padding: 14,
    borderWidth: 1,
    borderColor: '#f0e7dc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  note: { fontFamily: 'Cairo_400Regular', fontSize: 11, lineHeight: 19, color: '#857a6e', flexShrink: 1 },
});
