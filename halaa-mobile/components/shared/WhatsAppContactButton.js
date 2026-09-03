/**
 * WhatsApp customer-service contact button — mobile.
 *
 * Delegates to the shared openSupportWhatsApp launcher backed by LEGAL_CONTACT.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { openSupportWhatsApp } from '../../services/support/openSupportWhatsApp';
import { SUPPORT_SOURCE } from '@halaa/shared/support';
import { useTranslation } from '../../localization';

export default function WhatsAppContactButton({
  source = SUPPORT_SOURCE.GENERAL,
  reference = null,
  label,
  variant = 'filled',
  style,
  language,
}) {
  const { currentLanguage } = useTranslation();
  const effectiveLanguage = language || currentLanguage || 'ar';

  const handlePress = async () => {
    await openSupportWhatsApp({
      language: effectiveLanguage,
      source,
      reference,
    });
  };

  const variantStyle = variant === 'outlined' ? styles.outlined : styles.filled;
  const textStyle =
    variant === 'outlined' ? styles.outlinedText : styles.filledText;

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.button, variantStyle, style]}
      activeOpacity={0.85}
      testID="whatsapp-contact-button"
    >
      <FontAwesome
        name="whatsapp"
        size={20}
        color={variant === 'outlined' ? '#25d366' : '#ffffff'}
        style={{ marginEnd: 8 }}
      />
      <Text style={textStyle}>{label || 'تواصل معنا عبر واتساب'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  filled: {
    backgroundColor: '#25d366',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#25d366',
  },
  filledText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  outlinedText: {
    color: '#25d366',
    fontSize: 14,
    fontWeight: '600',
  },
});
