import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LocalizedText from '../commen/LocalizedText';
import { colors, spacing } from '../../styles/tokens';

// In-flow disclosure avoids clipping in cards, drawers and small-screen lists.
export default function EventActionDropdown({ label, icon = 'chevron-down', primary = false, disabled = false, children, onOpen, resetKey }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  useEffect(() => { setOpen(false); }, [resetKey]);
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setOpen(false); return true; });
    return () => subscription.remove();
  }, [open]);
  return <View style={styles.wrapper}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open, disabled }} disabled={disabled}
      style={[styles.trigger, primary && styles.primary, disabled && styles.disabled]}
      onPress={() => { if (!open) onOpen?.(); setOpen(!open); }}>
      <Ionicons name={icon} size={18} color={primary ? colors.natural[50] : colors.primary[800]} />
      <LocalizedText style={[styles.label, primary && styles.primaryLabel]}>{label}</LocalizedText>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={primary ? colors.natural[50] : colors.primary[800]} />
    </Pressable>
    {open && <View style={styles.panel}>{typeof children === 'function' ? children(close) : children}</View>}
  </View>;
}
export function EventActionItem({ label, icon, onPress, disabled, destructive }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.item, pressed && styles.pressed, disabled && styles.disabled]}>
    {!!icon && <Ionicons name={icon} size={18} color={destructive ? colors.error[500] : colors.primary[800]} />}
    <LocalizedText style={[styles.itemLabel, destructive && { color: colors.error[500] }]}>{label}</LocalizedText>
  </Pressable>;
}
const styles = StyleSheet.create({
  wrapper: { width: '100%', gap: spacing[8] },
  trigger: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing[12], padding: spacing[12], borderWidth: 1, borderColor: colors.primary[200], borderRadius: 12, backgroundColor: colors.natural[50] },
  primary: { backgroundColor: colors.primary[800], borderColor: colors.primary[800] },
  label: { flex: 1, color: colors.primary[800], fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
  primaryLabel: { color: colors.natural[50] },
  panel: { padding: spacing[8], borderRadius: 12, borderWidth: 1, borderColor: colors.primary[200], backgroundColor: colors.natural[50], gap: spacing[4] },
  item: { minHeight: 48, padding: spacing[12], flexDirection: 'row', alignItems: 'center', gap: spacing[12], borderRadius: 8 },
  itemLabel: { flex: 1, fontSize: 14, color: colors.secondary[800] },
  pressed: { backgroundColor: colors.primary[50] }, disabled: { opacity: 0.5 },
});
