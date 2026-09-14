import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LocalizedText from "../commen/LocalizedText";
import { colors, spacing } from "../../styles/tokens";

const MENU_GAP = 6;
const SCREEN_GUTTER = 12;

export default function EventActionDropdown({ label, icon = "chevron-down", primary = false, disabled = false, children, onOpen, resetKey }) {
  const triggerRef = useRef(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const close = () => setOpen(false);

  useEffect(() => { setOpen(false); }, [resetKey]);

  const showMenu = () => {
    if (disabled) return;
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      onOpen?.();
      setOpen(true);
    });
  };

  const menuWidth = Math.min(Math.max(anchor?.width || 0, 200), screenWidth - SCREEN_GUTTER * 2);
  const menuLeft = Math.max(SCREEN_GUTTER, Math.min(anchor?.x || SCREEN_GUTTER, screenWidth - menuWidth - SCREEN_GUTTER));
  const estimatedMenuHeight = 224;
  const roomBelow = screenHeight - ((anchor?.y || 0) + (anchor?.height || 0));
  const menuTop = roomBelow >= estimatedMenuHeight
    ? (anchor?.y || 0) + (anchor?.height || 0) + MENU_GAP
    : Math.max(SCREEN_GUTTER, (anchor?.y || 0) - estimatedMenuHeight - MENU_GAP);

  return (
    <View style={styles.wrapper}>
      <Pressable ref={triggerRef} accessibilityRole="button" accessibilityState={{ expanded: open, disabled }} disabled={disabled}
        style={({ pressed }) => [styles.trigger, primary && styles.primary, pressed && (primary ? styles.primaryPressed : styles.triggerPressed), disabled && styles.disabled]}
        onPress={open ? close : showMenu}>
        <Ionicons name={icon} size={17} color={primary ? colors.natural[50] : colors.primary[800]} />
        <LocalizedText style={[styles.label, primary && styles.primaryLabel]}>{label}</LocalizedText>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={15} color={primary ? colors.natural[50] : colors.primary[800]} />
      </Pressable>

      <Modal visible={open && Boolean(anchor)} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" accessibilityLabel="Close menu">
          <View style={[styles.panel, { left: menuLeft, top: menuTop, width: menuWidth }]} onStartShouldSetResponder={() => true}>
            {typeof children === "function" ? children(close) : children}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function EventActionItem({ label, icon, onPress, disabled, destructive }) {
  return (
    <Pressable accessibilityRole="menuitem" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed, disabled && styles.disabled]}>
      {!!icon && <Ionicons name={icon} size={17} color={destructive ? colors.error[500] : colors.primary[800]} />}
      <LocalizedText style={[styles.itemLabel, destructive && styles.destructiveLabel]}>{label}</LocalizedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%" },
  trigger: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing[8], paddingVertical: 9, paddingHorizontal: 14, borderWidth: 1, borderColor: "#D6B392", borderRadius: 10, backgroundColor: colors.natural[50] },
  triggerPressed: { backgroundColor: "#F9F4EF" },
  primary: { backgroundColor: "#C28E5C", borderColor: "#C28E5C" },
  primaryPressed: { backgroundColor: "#B07D4D", borderColor: "#B07D4D" },
  label: { flex: 1, color: colors.primary[800], fontSize: 14, fontFamily: "Cairo_600SemiBold" },
  primaryLabel: { color: colors.natural[50] },
  backdrop: { flex: 1, backgroundColor: "transparent" },
  panel: { position: "absolute", maxHeight: 224, padding: 6, borderRadius: 10, borderWidth: 1, borderColor: "#E4DDD6", backgroundColor: colors.natural[50], shadowColor: "#2C2C2C", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  item: { minHeight: 42, paddingVertical: 9, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: spacing[8], borderRadius: 8 },
  itemLabel: { flex: 1, fontSize: 14, color: colors.secondary[800] },
  itemPressed: { backgroundColor: "#FAF6F1" },
  destructiveLabel: { color: colors.error[500] },
  disabled: { opacity: 0.5 },
});
