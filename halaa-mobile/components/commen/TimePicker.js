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

const formatTime = (time) => {
  if (!time) return "";
  const t = new Date(time);
  const hours = t.getHours();
  const minutes = t.getMinutes();
  const ampm = hours >= 12 ? "مساءً" : "صباحاً";
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
};

/**
 * Inner field renderer. Hoisted out of the Controller `render` prop so the
 * `useState` hook lives at the top level of a real component — calling the
 * hook inside the render prop was a Rules-of-Hooks violation that desynced
 * the open/close state under heavy parent re-renders (e.g. inside StepThree's
 * template modal where the live canvas watches every field change). The
 * symptom was the picker refusing to open on tap (it looked "disabled").
 */
const TimePickerField = ({
  label,
  placeholder,
  disabled,
  value,
  error,
  onChange,
  extraProps,
}) => {
  const [show, setShow] = useState(false);
  const selectedTime = value ? new Date(value) : null;

  const handleTimeChange = (event, time) => {
    if (Platform.OS === "android") {
      setShow(false);
    }
    if (time) {
      onChange(time);
    }
  };

  const displayValue = selectedTime ? formatTime(selectedTime) : "";

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
        <Ionicons name="time-outline" size={20} color="#C28E5C" />
        <Text
          style={[styles.inputText, !displayValue && styles.placeholderText]}
        >
          {displayValue || placeholder}
        </Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error.message}</Text>}

      {show && (
        <DateTimePicker
          value={selectedTime || new Date()}
          mode="time"
          is24Hour={false}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeChange}
          textColor="#2C2C2C"
          {...extraProps}
        />
      )}
    </View>
  );
};

const TimePicker = ({
  name,
  label,
  placeholder,
  disabled = false,
  rules,
  ...props
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <TimePickerField
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          error={error}
          onChange={onChange}
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

export default TimePicker;
