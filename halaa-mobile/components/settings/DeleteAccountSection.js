/**
 * Self-service "Delete account" entry point.
 *
 * Required by Apple (Guideline 5.1.1(v)) and Google Play's data-deletion
 * policy. Rendered on every role's Settings screen so deletion is always
 * reachable in-app.
 *
 * Flow (SHIP §4.1/§4.2):
 *   button → modal → pre-deletion info (active store-subscription warning +
 *   retention disclosure + required reauth method) → type-to-confirm guard →
 *   REAUTHENTICATE (password or OTP) → backend deletion (returns requestId) →
 *   local session wipe via authStore.logout().
 */
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import TextInput from "../commen/DirectionalTextInput";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { useLanguage } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { useDeleteAccount } from "../../hooks";
import { usersApi } from "../../hooks/users/_api";

// Inline AR/EN copy for the deletion-specific UI so it renders correctly
// without depending on extra i18n keys being present in every bundle.
const COPY = {
  storeWarnTitle: {
    en: "Your store subscription stays active",
    ar: "اشتراكك في المتجر سيبقى فعّالاً",
  },
  storeWarnBody: {
    en: "Deleting your Halaa account does NOT cancel your App Store / Google Play subscription. Cancel it in the store to stop being billed.",
    ar: "حذف حسابك في هلا لا يلغي اشتراكك في App Store / Google Play. ألغِ الاشتراك من المتجر لإيقاف الخصم.",
  },
  manage: { en: "Manage subscription", ar: "إدارة الاشتراك" },
  passwordLabel: { en: "Enter your password to confirm", ar: "أدخل كلمة المرور للتأكيد" },
  passwordPlaceholder: { en: "Password", ar: "كلمة المرور" },
  otpLabel: { en: "Enter the verification code", ar: "أدخل رمز التحقق" },
  otpPlaceholder: { en: "Code", ar: "الرمز" },
  sendCode: { en: "Send verification code", ar: "إرسال رمز التحقق" },
  codeSent: { en: "Code sent to your phone", ar: "تم إرسال الرمز إلى هاتفك" },
};

const DeleteAccountSection = () => {
  const { t } = useTranslation("settings");
  const { currentLanguage } = useLanguage();
  const lang = currentLanguage === "ar" ? "ar" : "en";
  const tx = (k) => COPY[k][lang];
  const toast = useToast();
  const logout = useAuthStore((state) => state.logout);
  const deleteAccount = useDeleteAccount();

  const [modalVisible, setModalVisible] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [info, setInfo] = useState(null);

  const keyword = t("deleteAccount.confirmKeyword");
  const reauthMethod = info?.reauthMethod || "password";
  const credentialReady =
    reauthMethod === "otp" ? otp.trim().length >= 4 : password.length > 0;
  const keywordReady =
    confirmText.trim().toLowerCase() === keyword.trim().toLowerCase();
  const canDelete = keywordReady && credentialReady;
  const loading = deleteAccount.isPending;

  // Fetch pre-deletion info (store-subscription warning + reauth method) on open.
  useEffect(() => {
    if (!modalVisible) return;
    let active = true;
    usersApi
      .preDeletionInfo()
      .then((res) => active && setInfo(res?.data || res))
      .catch(() => active && setInfo({ reauthMethod: "password" }));
    return () => {
      active = false;
    };
  }, [modalVisible]);

  const closeModal = useCallback(() => {
    if (loading) return;
    setModalVisible(false);
    setConfirmText("");
    setPassword("");
    setOtp("");
    setOtpSent(false);
    setInfo(null);
  }, [loading]);

  const openStoreManager = useCallback(() => {
    const urls = info?.storeManageUrls || {};
    const url = Platform.OS === "ios" ? urls.ios : urls.android;
    if (url) Linking.openURL(url).catch(() => {});
  }, [info]);

  const sendOtp = useCallback(async () => {
    setSendingOtp(true);
    try {
      await usersApi.sendDeletionOtp();
      setOtpSent(true);
      toast.success(tx("codeSent"));
    } catch (error) {
      toast.error(error?.message || t("deleteAccount.error"));
    } finally {
      setSendingOtp(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, t, lang]);

  const handleConfirm = useCallback(async () => {
    if (!canDelete || loading) return;
    try {
      const body =
        reauthMethod === "otp" ? { otp: otp.trim() } : { password };
      await deleteAccount.mutateAsync(body);
      await logout();
      toast.success(t("deleteAccount.success"));
    } catch (error) {
      toast.error(error?.message || t("deleteAccount.error"));
    }
  }, [
    canDelete,
    loading,
    reauthMethod,
    otp,
    password,
    deleteAccount,
    logout,
    toast,
    t,
  ]);

  const retentionText = info?.retained?.[lang] || info?.retained?.en;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.deleteTab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t("deleteAccount.button")}
      >
        <View style={styles.tabContent}>
          <Ionicons name="trash-outline" size={22} color="#e74c3c" />
          <Text style={styles.deleteLabel}>{t("deleteAccount.button")}</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="warning-outline" size={28} color="#e74c3c" />
            </View>
            <Text style={styles.modalTitle}>{t("deleteAccount.title")}</Text>
            <Text style={styles.modalBody}>{t("deleteAccount.warning")}</Text>

            {/* Path B: active store-subscription warning + deep link (§4.2) */}
            {info?.hasActiveStoreSubscription ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>{tx("storeWarnTitle")}</Text>
                <Text style={styles.warningBody}>{tx("storeWarnBody")}</Text>
                <TouchableOpacity onPress={openStoreManager} activeOpacity={0.7}>
                  <Text style={styles.link}>{tx("manage")}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {retentionText ? (
              <Text style={styles.retention}>{retentionText}</Text>
            ) : null}

            <Text style={styles.confirmLabel}>
              {t("deleteAccount.confirmLabel", { keyword })}
            </Text>
            <TextInput
              style={styles.input}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder={keyword}
              placeholderTextColor="#bbb"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />

            {/* Reauthentication (§4.1): password or OTP */}
            {reauthMethod === "otp" ? (
              <>
                <Text style={styles.confirmLabel}>{tx("otpLabel")}</Text>
                {otpSent ? (
                  <TextInput
                    style={styles.input}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder={tx("otpPlaceholder")}
                    placeholderTextColor="#bbb"
                    keyboardType="number-pad"
                    autoCorrect={false}
                    editable={!loading}
                  />
                ) : (
                  <TouchableOpacity
                    style={[styles.sendCodeBtn, sendingOtp && styles.confirmBtnDisabled]}
                    onPress={sendOtp}
                    disabled={sendingOtp}
                    activeOpacity={0.7}
                  >
                    {sendingOtp ? (
                      <ActivityIndicator size="small" color="#c28e5c" />
                    ) : (
                      <Text style={styles.sendCodeText}>{tx("sendCode")}</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <Text style={styles.confirmLabel}>{tx("passwordLabel")}</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={tx("passwordPlaceholder")}
                  placeholderTextColor="#bbb"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn]}
                onPress={closeModal}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>
                  {t("deleteAccount.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.confirmBtn,
                  (!canDelete || loading) && styles.confirmBtnDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!canDelete || loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>
                    {t("deleteAccount.confirm")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: "100%", marginTop: 8 },
  deleteTab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffe5e5",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "flex-start",
  },
  deleteLabel: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#e74c3c",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fdecec",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#222",
    textAlign: "center",
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  warningBox: {
    alignSelf: "stretch",
    backgroundColor: "#fff8ec",
    borderColor: "#f0d9b5",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  warningTitle: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    color: "#8a6d3b",
    marginBottom: 4,
    textAlign: "center",
  },
  warningBody: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#8a6d3b",
    lineHeight: 18,
    textAlign: "center",
  },
  link: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    color: "#c28e5c",
    textAlign: "center",
    textDecorationLine: "underline",
  },
  retention: {
    alignSelf: "stretch",
    fontSize: 11.5,
    fontFamily: "Cairo_400Regular",
    color: "#888",
    lineHeight: 17,
    marginBottom: 16,
    textAlign: "center",
  },
  confirmLabel: {
    alignSelf: "stretch",
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: "Cairo_400Regular",
    backgroundColor: "#fafafa",
    color: "#222",
    marginBottom: 16,
  },
  sendCodeBtn: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: "#c28e5c",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  sendCodeText: {
    color: "#c28e5c",
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  actions: { flexDirection: "row", gap: 12, alignSelf: "stretch" },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: { backgroundColor: "#f0f0f0" },
  cancelText: {
    color: "#333",
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
  },
  confirmBtn: { backgroundColor: "#e74c3c" },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
  },
});

export default DeleteAccountSection;
