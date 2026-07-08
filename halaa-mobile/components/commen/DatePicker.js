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
import { formatTemplateDate } from "@halla/shared/utils/formatTemplateDate";

/**
 * Inner field renderer. Hoisted out of the Controller `render` prop so the
 * `useState` hook lives at the top level of a real component — calling the
 * hook inside the render prop was a Rules-of-Hooks violation that desynced
 * the open/close state when the parent form re-rendered heavily (e.g. inside
 * StepThree's template modal where the live canvas watches every field
 * change). The symptom was the picker refusing to open on tap (it looked
 * "disabled").
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
  formatDate,
  extraProps,
}) => {
  const [show, setShow] = useState(false);
  const selectedDate = value ? new Date(value) : null;

  const handleDateChange = (event, date) => {
    if (Platform.OS === "android") {
      setShow(false);
    }
    if (date) {
      onChange(date);
    }
  };

  const displayValue = selectedDate ? formatDate(selectedDate) : "";

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[
          styles.inputContainer,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
        onPress={() => !disabled && setShow(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={20} color="#C28E5C" />
        <Text
          style={[styles.inputText, !displayValue && styles.placeholderText]}
        >
          {displayValue || placeholder}
        </Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error.message}</Text>}

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
  const { t } = useTranslation("common");
  const { control } = useFormContext();

  const formatDate = (date) => formatTemplateDate(date, t);

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
          formatDate={formatDate}
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
    borderWidth: 1.5,
    borderTopWidth: 1,
    borderRightWidth: 1.5,
    borderBottomWidth: 1,
    borderLeftWidth: 1.5,
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
