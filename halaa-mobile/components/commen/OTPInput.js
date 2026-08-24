import React, { useRef, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { useFormContext, Controller } from "react-hook-form";
import LocalizedText from "./LocalizedText";

/**
 * Hoisted inner component to satisfy Rules-of-Hooks and manage shake animation.
 */
const OTPInputField = ({ length, value, error, onChange }) => {
  const otp = value || "";
  const inputRefs = useRef([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

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
  }, [error, shakeAnimation]);

  const handleChange = (text, index) => {
    const digits = String(text || "").replace(/\D/g, "");

    // iOS Security Code AutoFill (and Android SMS OTP) inserts the complete
    // code into the focused native input. Distribute that value across the
    // visual boxes instead of truncating it to one character.
    if (digits.length > 1) {
      const completeOtp = digits.slice(0, length);
      onChange(completeOtp);
      inputRefs.current[Math.min(completeOtp.length, length) - 1]?.focus();
      return;
    }

    const newOtp = otp.split("");
    newOtp[index] = digits;
    const newOtpString = newOtp.join("");
    onChange(newOtpString);

    if (digits && index < length - 1) {
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
            maxLength={length}
            {...(Platform.OS === "ios"
              ? { textContentType: "oneTimeCode" }
              : { autoComplete: "sms-otp" })}
            textAlign="center"
            selectTextOnFocus
          />
        ))}
      </Animated.View>
      {error && (
        // Validation copy is app-authored: it follows the UI locale even
        // though the OTP digits themselves are LTR tokens.
        <LocalizedText role="error" center style={styles.errorText}>
          {error.message}
        </LocalizedText>
      )}
    </View>
  );
};

/**
 * Form-bound flavour — the value lives in the surrounding react-hook-form.
 */
const FormOTPInput = ({ name, length, rules }) => {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <OTPInputField
          length={length}
          value={value}
          error={error}
          onChange={onChange}
        />
      )}
    />
  );
};

const OTPInput = ({ name, length = 6, rules, value, onChangeText }) => {
  // Controlled flavour (blueprint §5.2): callers outside a form (e.g. the
  // email-verification flow) pass `value` + `onChangeText` directly instead
  // of registering an anonymous form field.
  if (value !== undefined || onChangeText !== undefined) {
    return (
      <OTPInputField
        length={length}
        value={value}
        onChange={onChangeText}
      />
    );
  }
  return <FormOTPInput name={name} length={length} rules={rules} />;
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
    writingDirection: "ltr",
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
