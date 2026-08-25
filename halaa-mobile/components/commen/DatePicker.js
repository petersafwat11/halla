import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useFormContext, Controller } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { isolateAuto } from "@halaa/shared/utils/bidi";
import { useTranslation } from "../../localization";
import { useFieldDirection } from "../../hooks/useInputDirection";
import { formatDate as formatLocaleDate } from "@halaa/shared/utils/locale";
import IosDateTimePickerSheet from "./IosDateTimePickerSheet";

/**
 * Shared date field (blueprint §5.3 "Date/time controls").
 *
 * - Label, placeholder and error always follow the UI locale.
 * - The value is a localized, BiDi-isolated formatted token — never the raw
 *   stored date and never a physical alignment patch.
 * - Anatomy matches the create/update event reference: localized label on
 *   top, value text at the logical start of the row, trailing calendar
 *   affordance at the logical end (§5.2).
 * - iOS presents the shared `IosDateTimePickerSheet` with draft ownership:
 *   spinning the wheel never commits until Confirm. Android keeps the native
 *   dialog and commits immediately on a non-dismissed selection.
 */

// Safe Date coercion — returns null instead of an Invalid Date when a stored
// form value cannot be represented on the picker wheel.
const validDateOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Clamp a draft onto the selectable range so the sheet never opens outside
// [minimumDate, maximumDate].
const clampToRange = (date, minimumDate, maximumDate) => {
  let clamped = date;
  if (minimumDate && clamped.getTime() < minimumDate.getTime()) {
    clamped = new Date(minimumDate.getTime());
  }
  if (maximumDate && clamped.getTime() > maximumDate.getTime()) {
    clamped = new Date(maximumDate.getTime());
  }
  return clamped;
};

/**
 * Inner field renderer. Hoisted out of the Controller `render` prop so the
 * `useState` hooks live at the top level of a real component.
 */
const DatePickerField = ({
  label,
  placeholder,
  disabled,
  minimumDate,
  maximumDate,
  value,
  error,
  onChange,
  locale,
  isRTL,
  sheetTitle,
  cancelLabel,
  confirmLabel,
}) => {
  const [show, setShow] = useState(false);
  // Draft ownership mirrors create/update event Step 1: wheel changes stay
  // local until Confirm commits them into the react-hook-form state.
  const [draftDate, setDraftDate] = useState(() => new Date());
  // Field-direction contract (blueprint §5): the formatted date is a
  // localized token so label/value/error all follow the UI locale.
  const fieldDirection = useFieldDirection("localized", {
    hasValue: !!value,
  });
  const selectedDate = validDateOrNull(value);

  const openPicker = () => {
    if (disabled) return;
    setDraftDate(
      clampToRange(selectedDate || new Date(), minimumDate, maximumDate)
    );
    setShow(true);
  };

  const handleAndroidChange = (event, date) => {
    setShow(false);
    if (event?.type !== "dismissed" && date) {
      onChange(date);
    }
  };

  const displayValue = selectedDate ? formatLocaleDate(selectedDate, locale) : "";

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, fieldDirection.text]}>{label}</Text>
      )}
      <TouchableOpacity
        style={[
          styles.inputContainer,
          show && styles.inputContainerActive,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
        onPress={openPicker}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={typeof label === "string" ? label : undefined}
        accessibilityState={{ expanded: show }}
      >
        <Text
          style={[
            styles.inputText,
            fieldDirection.input,
            !displayValue && styles.placeholderText,
          ]}
        >
          {/* Localized formatted date, isolated as its own BiDi run (§6). */}
          {displayValue ? isolateAuto(displayValue) : placeholder}
        </Text>
        {/* Calendar glyph is a semantic trailing affordance, never mirrored (§7). */}
        <Ionicons name="calendar-outline" size={20} color="#C28E5C" />
      </TouchableOpacity>
      {error && (
        <Text style={[styles.errorText, fieldDirection.text]}>
          {error.message}
        </Text>
      )}

      {show && Platform.OS === "ios" && (
        <IosDateTimePickerSheet
          visible={show}
          mode="date"
          title={sheetTitle || label}
          value={draftDate}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          cancelLabel={cancelLabel}
          confirmLabel={confirmLabel}
          locale={locale}
          isRTL={isRTL}
          onChange={(_, date) => {
            if (date) setDraftDate(date);
          }}
          onCancel={() => setShow(false)}
          onConfirm={() => {
            if (draftDate) onChange(draftDate);
            setShow(false);
          }}
        />
      )}

      {show && Platform.OS !== "ios" && (
        <DateTimePicker
          value={draftDate}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          textColor="#2C2C2C"
        />
      )}
    </View>
  );
};

const DatePicker = ({
  name,
  label,
  placeholder,
  disabled = false,
  minimumDate,
  maximumDate,
  rules,
  sheetTitle,
  cancelLabel,
  confirmLabel,
  ...props
}) => {
  const { currentLanguage, isRTL } = useTranslation();
  const { t } = useTranslation("common");
  const { control } = useFormContext();
  const pickerLocale = currentLanguage === "ar" ? "ar-SA" : "en-US";

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <DatePickerField
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          value={value}
          error={error}
          onChange={onChange}
          locale={pickerLocale}
          isRTL={isRTL}
          sheetTitle={sheetTitle}
          cancelLabel={cancelLabel ?? t("buttons.cancel")}
          confirmLabel={confirmLabel ?? t("buttons.confirm")}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 8,
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#fff",
    minHeight: 50,
    paddingHorizontal: 16,
    gap: 12,
  },
  inputContainerActive: {
    borderColor: "#C28E5C",
    backgroundColor: "#FFFCF9",
  },
  inputContainerError: {
    borderColor: "#e74c3c",
  },
  inputContainerDisabled: {
    backgroundColor: "#f5f5f5",
    opacity: 0.6,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
  },
  placeholderText: {
    color: "#999",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4,
  },
});

export default DatePicker;
