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
  const { control } = useFormContext();

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
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
                style={[
                  styles.inputText,
                  !displayValue && styles.placeholderText,
                ]}
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
                {...props}
              />
            )}
          </View>
        );
      }}
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
