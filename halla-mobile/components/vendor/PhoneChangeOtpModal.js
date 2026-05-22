import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "../../localization/hooks/useTranslation";
import { useToast } from "../../contexts/ToastContext";
import { vendorService } from "../../services/vendorService";

/**
 * Phone-change OTP modal (mobile).
 *
 * 1. Opens with a new candidate phone number and immediately requests an OTP.
 * 2. User enters the code; we PATCH /users/profile/phone to commit the change.
 * 3. On success, calls onSuccess so the parent can refetch the profile.
 */
const PhoneChangeOtpModal = ({ visible, phoneNumber, onClose, onSuccess }) => {
  const { t } = useTranslation("vendor");
  const toast = useToast();
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendOtp = async () => {
    if (!phoneNumber) return;
    setSending(true);
    try {
      await vendorService.sendPhoneChangeOtp(phoneNumber);
      toast.info(
        t(
          "settings.phoneOtp.sent",
          "Verification code sent to your new phone number"
        )
      );
    } catch (err) {
      toast.error(
        err.message ||
          t("settings.phoneOtp.sendFailed", "Failed to send verification code")
      );
      onClose && onClose();
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (visible && phoneNumber) {
      setOtp("");
      sendOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, phoneNumber]);

  const verify = async () => {
    if (!otp.trim()) return;
    setVerifying(true);
    try {
      await vendorService.updatePhone(phoneNumber, otp.trim());
      toast.success(t("settings.phoneOtp.success", "Phone number updated"));
      onSuccess && onSuccess();
    } catch (err) {
      toast.error(
        err.message || t("settings.phoneOtp.verifyFailed", "Invalid code")
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            {t("settings.phoneOtp.title", "Verify your new phone number")}
          </Text>
          <Text style={styles.subtitle}>
            {t(
              "settings.phoneOtp.subtitle",
              "We sent a verification code to {{phone}}",
              { phone: phoneNumber || "" }
            )}
          </Text>

          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="••••••"
            placeholderTextColor="#bbb"
            maxLength={8}
            value={otp}
            onChangeText={setOtp}
            editable={!sending && !verifying}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, (!otp || verifying) && styles.disabledBtn]}
            onPress={verify}
            disabled={!otp || verifying}
          >
            {verifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {t("settings.phoneOtp.verify", "Verify")}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={sendOtp}
            disabled={sending || verifying}
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>
              {sending
                ? t("settings.phoneOtp.sending", "Sending…")
                : t("settings.phoneOtp.resend", "Resend code")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} disabled={verifying} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>
              {t("common.cancel", "Cancel")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 380,
  },
  title: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 22,
    letterSpacing: 6,
    textAlign: "center",
    color: "#2c2c2c",
    fontFamily: "monospace",
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: "#c28e5c",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabledBtn: { opacity: 0.5 },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
  },
  linkBtn: { paddingVertical: 10, alignItems: "center" },
  linkText: { color: "#c28e5c", fontSize: 13, textDecorationLine: "underline" },
  cancelBtn: { paddingVertical: 10, alignItems: "center" },
  cancelText: { color: "#888", fontSize: 14 },
});

export default PhoneChangeOtpModal;
