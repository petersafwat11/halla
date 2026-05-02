import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from "react-native";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { otpSchema } from "../../utils/schemas/authSchemas";
import { OTPInput, Button } from "../commen";
import { useTranslation } from "../../localization";

const OTPVerificationForm = ({
  onSubmit,
  onEditPhone,
  phoneNumber,
  loading = false,
  resendTimer = 90,
}) => {
  const { t } = useTranslation("auth");
  const [timer, setTimer] = useState(resendTimer);
  const [canResend, setCanResend] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const methods = useForm({
    resolver: zodResolver(otpSchema),
    mode: "onChange",
    defaultValues: {
      otp: "",
    },
  });

  const { handleSubmit, setError } = methods;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleResend = () => {
    console.log("Resend OTP");
    setTimer(resendTimer);
    setCanResend(false);
  };

  const onFormSubmit = async (data) => {
    if (onSubmit) {
      const result = await onSubmit(data);
      if (result && !result.success && result.fieldErrors) {
        Object.keys(result.fieldErrors).forEach((field) => {
          setError(field, {
            type: "server",
            message: result.fieldErrors[field],
          });
        });
      }
    }
  };

  return (
    <FormProvider {...methods}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>📱</Text>
          </View>
          <Text style={styles.title}>{t("otp.title")}</Text>
        </View>

        <View style={styles.description}>
          <Text style={styles.descriptionText}>
            {t("otp.description")} {phoneNumber}
          </Text>
          <Text style={styles.descriptionText}>
            {t("otp.descriptionContinue")}
          </Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={!canResend}
            style={styles.resendContainer}
          >
            <Text
              style={[
                styles.resendText,
                !canResend && styles.resendTextDisabled,
              ]}
            >
              {t("otp.resendCode")}{" "}
              {!canResend && `(${timer} ${t("otp.resendTimer")})`}
            </Text>
          </TouchableOpacity>
        </View>

        <OTPInput name="otp" />

        <View style={styles.bottom}>
          <Button
            text={t("otp.verifyButton")}
            onPress={handleSubmit(onFormSubmit)}
            loading={loading}
          />
          <TouchableOpacity
            onPress={onEditPhone}
            style={styles.editPhoneButton}
          >
            <Text style={styles.editPhoneText}>{t("otp.editPhone")}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    textAlign: "center",
  },
  description: {
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 4,
  },
  resendContainer: {
    marginTop: 8,
  },
  resendText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
  resendTextDisabled: {
    color: "#999",
  },
  bottom: {
    width: "100%",
    marginTop: 24,
  },
  editPhoneButton: {
    marginTop: 16,
    alignItems: "center",
  },
  editPhoneText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
});

export default OTPVerificationForm;
