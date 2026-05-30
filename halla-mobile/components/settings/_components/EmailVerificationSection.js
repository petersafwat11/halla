import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from "react-native";
import { useTranslation } from "../../../localization";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../stores/authStore";
import { EmailInput, OTPInput } from "../../commen";
import { settingsApi } from "../../../hooks/users/_api";

const EmailVerificationSection = ({ emailValue, loading }) => {
  const { t } = useTranslation("settings");
  const toast = useToast();
  const { user } = useAuthStore();

  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSendVerificationCode = async () => {
    setIsVerifyingEmail(true);
    try {
      await settingsApi.sendEmailVerificationCode();
      setShowVerificationInput(true);
      toast.success(t("account.verificationCodeSent"));
    } catch (error) {
      toast.error(error.message || t("account.verificationCodeError"));
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error(t("account.invalidVerificationCode"));
      return;
    }

    setIsVerifyingEmail(true);
    try {
      await settingsApi.verifyEmail(verificationCode);
      toast.success(t("account.emailVerified"));
      setShowVerificationInput(false);
      setVerificationCode("");
    } catch (error) {
      toast.error(error.message || t("account.verificationError"));
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.emailWrapper}>
        <EmailInput
          name="email"
          label={t("account.email")}
          placeholder={t("account.emailPlaceholder")}
          disabled={loading}
        />

        {!user?.emailVerified && !showVerificationInput && (
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleSendVerificationCode}
            disabled={isVerifyingEmail || !emailValue}
            activeOpacity={0.7}
          >
            <Text style={styles.verifyButtonText}>
              {isVerifyingEmail ? t("account.sending") : t("account.sendCode")}
            </Text>
          </TouchableOpacity>
        )}

        {user?.emailVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>
              ✓ {t("account.emailVerified")}
            </Text>
          </View>
        )}

        {showVerificationInput && (
          <View style={styles.verificationGroup}>
            <OTPInput
              value={verificationCode}
              onChangeText={setVerificationCode}
              length={6}
            />
            <TouchableOpacity
              style={[
                styles.verifyCodeButton,
                (isVerifyingEmail || verificationCode.length !== 6) &&
                  styles.verifyCodeButtonDisabled,
              ]}
              onPress={handleVerifyCode}
              disabled={isVerifyingEmail || verificationCode.length !== 6}
              activeOpacity={0.7}
            >
              <Text style={styles.verifyCodeButtonText}>
                {isVerifyingEmail ? t("account.verifying") : t("account.verifyCode")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  emailWrapper: {
    width: "100%",
  },
  verifyButton: {
    backgroundColor: "#c28e5c",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  verifiedBadge: {
    backgroundColor: "#4caf50",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  verifiedText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  verificationGroup: {
    marginTop: 16,
    width: "100%",
  },
  verifyCodeButton: {
    backgroundColor: "#c28e5c",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  verifyCodeButtonDisabled: {
    backgroundColor: "#e0e0e0",
  },
  verifyCodeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
});

export default EmailVerificationSection;
