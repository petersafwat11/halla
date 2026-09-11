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
      <Ionicons name="qr-code-outline" size={44} color="#3a3028" />
      <Text style={[styles.note, direction.text]}>{t('reply_preview_qr_placeholder')}</Text>
    </View>}
    <Text style={styles.message}>{isolateAuto(preview.text)}</Text>
    <Text style={[styles.note, direction.text]}>{t(preview.richCaption ? 'reply_preview_details_note' : preview.channel === 'portal' ? 'reply_preview_portal_note' : 'reply_preview_text_note')}</Text>
  </View>;
}
const styles = StyleSheet.create({
  preview: { padding: 16, borderWidth: 1, borderColor: '#e2e5df', borderRadius: 10, backgroundColor: '#f6f8f4', gap: 12 },
  heading: { fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#3a3028' },
  qr: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  message: { fontFamily: 'Cairo_400Regular', fontSize: 13, lineHeight: 24, color: '#3a3028', writingDirection: 'auto' },
  note: { fontFamily: 'Cairo_400Regular', fontSize: 11, lineHeight: 19, color: '#655e55', flexShrink: 1 },
});
