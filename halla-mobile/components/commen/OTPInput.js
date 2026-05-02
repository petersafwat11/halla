import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  Animated,
  Platform,
} from "react-native";
import { useFormContext, Controller } from "react-hook-form";

const OTPInput = ({ name, length = 6, rules }) => {
  const { control } = useFormContext();
  const inputRefs = useRef([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const otp = value || "";

        useEffect(() => {
          if (error) {
            Animated.sequence([
              Animated.timing(shakeAnimation, {
                toValue: 10,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(shakeAnimation, {
                toValue: -10,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(shakeAnimation, {
                toValue: 10,
                duration: 100,
                useNativeDriver: true,
              }),
              Animated.timing(shakeAnimation, {
                toValue: 0,
                duration: 100,
                useNativeDriver: true,
              }),
            ]).start();
          }
        }, [error]);

        const handleChange = (text, index) => {
          const newOtp = otp.split("");
          newOtp[index] = text;
          const newOtpString = newOtp.join("");
          onChange(newOtpString);

          // Move to next input
          if (text && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
          }
        };

        const handleKeyPress = (e, index) => {
          if (e.nativeEvent.key === "Backspace") {
            if (!otp[index] && index > 0) {
              inputRefs.current[index - 1]?.focus();
            }
            const newOtp = otp.split("");
            newOtp[index] = "";
            const newOtpString = newOtp.join("");
            onChange(newOtpString);
          }
        };

        return (
          <View style={styles.container}>
            <Animated.View
              style={[
                styles.inputContainer,
                { transform: [{ translateX: shakeAnimation }] },
              ]}
            >
              {Array.from({ length }).map((_, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.input,
                    error && styles.inputError,
                    otp[index] && styles.inputFilled,
                  ]}
                  value={otp[index] || ""}
                  onChangeText={(text) => handleChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                />
              ))}
            </Animated.View>
            {error && <Text style={styles.errorText}>{error.message}</Text>}
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  inputContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  input: {
    width: 50,
    height: 56,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputFilled: {
    borderColor: "#c28e5c",
    borderWidth: 2,
  },
  inputError: {
    borderColor: "#e74c3c",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 8,
    textAlign: "center",
  },
});

export default OTPInput;
