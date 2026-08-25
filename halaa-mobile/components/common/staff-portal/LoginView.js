import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import KeyboardAwareFormScrollView from "../../commen/keyboard/KeyboardAwareFormScrollView";
import TextInput from "../../commen/DirectionalTextInput";
import { Ionicons } from "@expo/vector-icons";
import { useVerifyStaffAccess } from "../../../hooks/staff";
import {
  clampPhoneInput,
  isValidPhone,
  getPhoneMaxLength,
  DEFAULT_PHONE_PLACEHOLDER,
} from "@halaa/shared/utils/phone";

const LoginView = ({ onVerified, t }) => {
  const [phone, setPhone] = useState("");
  const [eventId, setEventId] = useState("");
  const [errors, setErrors] = useState({});
  const verifyMutation = useVerifyStaffAccess();

  const validate = () => {
    const newErrors = {};
    if (!phone.trim()) {
      newErrors.phone = t("login.errors.phoneRequired");
    } else if (!isValidPhone(phone)) {
      newErrors.phone = t("login.errors.phoneInvalid", "رقم الجوال غير صحيح");
    }
    if (!eventId.trim()) newErrors.eventId = t("login.errors.eventIdRequired");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerify = async () => {
    if (!validate()) return;
    try {
      const result = await verifyMutation.mutateAsync({
        phone: phone.trim(),
        eventId: eventId.trim(),
      });
      if (result?.staff && result?.event) {
        onVerified(result);
      } else {
        Alert.alert("", t("login.errors.invalidCredentials"));
      }
    } catch (err) {
      const reason = err?.reason;
      if (reason === "staff_revoked") {
        Alert.alert("", t("errors.staffRevoked"));
      } else if (reason === "staff_expired") {
        Alert.alert("", t("errors.staffExpired"));
      } else {
        Alert.alert("", err.message || t("login.errors.verificationFailed"));
      }
    }
  };

  const loading = verifyMutation.isPending || verifyMutation.isLoading;

  return (
    // One shared owner for the portal login form (§8.2 guest/staff row).
    <KeyboardAwareFormScrollView
      style={styles.loginContainer}
      contentContainerStyle={styles.loginScroll}
    >
        <View style={styles.loginHeader}>
          <View style={styles.loginIconWrap}>
            <Ionicons name="people" size={40} color="#C28E5C" />
          </View>
          <Text style={styles.loginTitle}>{t("login.title")}</Text>
          <Text style={styles.loginSubtitle}>{t("login.subtitle")}</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("login.phoneLabel")}</Text>
          <View style={[styles.inputRow, errors.phone && styles.inputRowError]}>
            <Ionicons name="call-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t("login.phonePlaceholder", DEFAULT_PHONE_PLACEHOLDER)}
              placeholderTextColor="#9CA3AF"
              value={phone}
              maxLength={getPhoneMaxLength(phone)}
              onChangeText={(v) => {
                const clamped = clampPhoneInput(v);
                setPhone(clamped);
                setErrors((e) => ({ ...e, phone: undefined }));
              }}
              keyboardType="phone-pad"
            />
          </View>
          {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("login.eventIdLabel")}</Text>
          <View style={[styles.inputRow, errors.eventId && styles.inputRowError]}>
            <Ionicons name="calendar-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t("login.eventIdPlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={eventId}
              onChangeText={(v) => { setEventId(v); setErrors((e) => ({ ...e, eventId: undefined })); }}
              autoCapitalize="none"
              contentDirection="ltr"
            />
          </View>
          {errors.eventId ? <Text style={styles.fieldError}>{errors.eventId}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.verifyBtnText}>{t("login.verifyButton")}</Text>
          )}
        </TouchableOpacity>
    </KeyboardAwareFormScrollView>
  );
};

const styles = StyleSheet.create({
  loginContainer: { flex: 1 },
  loginScroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  loginHeader: { alignItems: "center", marginBottom: 40 },
  loginIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F5ECE4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DFDFDF",
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputRowError: { borderColor: "#C0392B" },
  inputIcon: { marginEnd: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    paddingVertical: 10,
  },
  fieldError: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#C0392B",
    marginTop: 4,
  },
  verifyBtn: {
    backgroundColor: "#C28E5C",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  verifyBtnDisabled: { opacity: 0.65 },
  verifyBtnText: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
  },
});

export default LoginView;
