import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Shared iOS date/time bottom sheet (blueprint §4.3).
 *
 * iOS does not add confirm/cancel controls around the spinner-style picker.
 * This sheet supplies those controls and deliberately leaves value ownership
 * with the caller so spinning the wheel never mutates the form prematurely.
 *
 * The toolbar keeps an explicit `direction` because native modals do not
 * reliably inherit the root RTL layout direction on iOS; child order stays
 * logical (cancel → title → confirm) and `flexDirection: "row"` is never
 * reversed.
 */
const IosDateTimePickerSheet = ({
  visible,
  mode,
  title,
  value,
  minimumDate,
  maximumDate,
  cancelLabel,
  confirmLabel,
  locale,
  isRTL = false,
  onChange,
  onCancel,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onCancel}
        accessible={false}
      >
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          onPress={(event) => event.stopPropagation()}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />

          <View style={[styles.toolbar, { direction: isRTL ? "rtl" : "ltr" }]}>
            <TouchableOpacity
              style={styles.toolbarAction}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              hitSlop={8}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>

            <TouchableOpacity
              style={[styles.toolbarAction, styles.confirmAction]}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              hitSlop={8}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerFrame}>
            <DateTimePicker
              value={value}
              mode={mode}
              display="spinner"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={onChange}
              locale={locale}
              textColor="#2C2C2C"
              themeVariant="light"
              style={styles.picker}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(24, 20, 17, 0.48)",
  },
  sheet: {
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 18,
  },
  handle: {
    width: 38,
    height: 5,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 3,
    backgroundColor: "#D7D2CE",
  },
  toolbar: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EAE6E2",
  },
  toolbarAction: {
    width: 76,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  confirmAction: {
    backgroundColor: "#F5ECE4",
  },
  cancelText: {
    color: "#66615D",
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Cairo_500Medium",
  },
  confirmText: {
    color: "#8A5B31",
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Cairo_700Bold",
  },
  title: {
    flex: 1,
    paddingHorizontal: 8,
    color: "#2C2C2C",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Cairo_700Bold",
  },
  pickerFrame: {
    minHeight: 224,
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  picker: {
    width: "100%",
    height: 216,
  },
});

export default IosDateTimePickerSheet;
