/**
 * WhatsApp customer-service contact button — mobile (Phase 3c.3).
 *
 * Mirrors the web component in `labbe/ui/commen/whatsappButton`. Used by
 * the mobile failure UI (3c.5) and reusable for Phase 4 mobile-parity
 * work. Generates a `wa.me/<number>?text=<msg>` link and opens it via
 * `Linking.openURL`.
 *
 * Replace `WHATSAPP_CONTACT_NUMBER` (or set EXPO_PUBLIC_HALLA_WHATSAPP_NUMBER
 * in `.env`) when the production support number is known.
 */

import React from 'react';
import { TouchableOpacity, Text, Linking, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const WHATSAPP_CONTACT_NUMBER =
  process.env.EXPO_PUBLIC_HALLA_WHATSAPP_NUMBER || '966500000000';

export default function WhatsAppContactButton({
  contextMessage = '',
  label,
  variant = 'filled',
  style,
}) {
  const handlePress = async () => {
    const text = encodeURIComponent(contextMessage || '');
    const url = `https://wa.me/${WHATSAPP_CONTACT_NUMBER}${text ? `?text=${text}` : ''}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.warn('[WhatsAppContactButton] failed to open URL:', err.message);
    }
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

export { WHATSAPP_CONTACT_NUMBER };
