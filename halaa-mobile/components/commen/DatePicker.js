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
import { useTranslation } from "../../localization";
import { useFieldDirection } from "../../hooks/useInputDirection";
import { formatDate as formatLocaleDate } from "@halaa/shared/utils/locale";

/**
 * Inner field renderer. Hoisted out of the Controller `render` prop so the
 * `useState` hook lives at the top level of a real component.
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
  extraProps,
}) => {
  const [show, setShow] = useState(false);
  // Field-direction contract (blueprint §5): label/helper/error always follow
  // the UI locale; the formatted date value is a localized token so it uses
  // the same locale direction — never a physical alignment patch.
  const fieldDirection = useFieldDirection("localized", {
    hasValue: !!value,
  });
  const selectedDate = value ? new Date(value) : null;

  const handleDateChange = (event, date) => {
    if (Platform.OS === "android") {
      setShow(false);
    }
    if (date) {
      onChange(date);
    }
  };

  const displayValue = selectedDate ? formatLocaleDate(selectedDate, locale) : "";

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, fieldDirection.text]}>{label}</Text>}
      <TouchableOpacity
        style={[
          styles.inputContainer,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
        onPress={() => !disabled && setShow(true)}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={typeof label === "string" ? label : undefined}
      >
        {/* Calendar glyph is semantic-leading and never mirrored (§7). */}
        <Ionicons name="calendar-outline" size={20} color="#C28E5C" />
        <Text
          style={[
            styles.inputText,
            fieldDirection.input,
            !displayValue && styles.placeholderText,
          ]}
        >
          {displayValue || placeholder}
        </Text>
      </TouchableOpacity>
      {error && (
        <Text style={[styles.errorText, fieldDirection.text]}>
          {error.message}
        </Text>
      )}

      {show && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          textColor="#2C2C2C"
          {...extraProps}
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
  ...props
}) => {
  const { currentLanguage } = useTranslation();
  const { control } = useFormContext();

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
          locale={currentLanguage}
          extraProps={props}
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
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#DFDFDF",
    borderRadius: 12,
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 50,
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
    fontSize: 16,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    lineHeight: 24,
    letterSpacing: 0.08,
  },
  placeholderText: {
    color: "#767676",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 4,
    paddingHorizontal: 8,
  },
});

export default DatePicker;
