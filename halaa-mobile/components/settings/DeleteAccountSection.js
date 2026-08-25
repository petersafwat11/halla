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
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import KeyboardSafeModalSheet from "../commen/keyboard/KeyboardSafeModalSheet";
import TextInput from "../commen/DirectionalTextInput";
import LocalizedText from "../commen/LocalizedText";
import AdaptiveText from "../commen/AdaptiveText";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { useLanguage } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { useDeleteAccount } from "../../hooks";
import { usersApi } from "../../hooks/users/_api";

const DeleteAccountSection = () => {
  const { t } = useTranslation("settings");
  const { currentLanguage } = useLanguage();
  const lang = currentLanguage === "ar" ? "ar" : "en";
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
      toast.success(t("deleteAccount.codeSent"));
    } catch (error) {
      toast.error(error?.message || t("deleteAccount.error"));
    } finally {
      setSendingOtp(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, t]);

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
          {/* Trash is semantic — never mirrored. */}
          <Ionicons name="trash-outline" size={22} color="#e74c3c" />
          <LocalizedText role="label" style={styles.deleteLabel}>
            {t("deleteAccount.button")}
          </LocalizedText>
        </View>
      </TouchableOpacity>

      {/* Confirmation card (§8.2 account row): centered shared sheet — the
          keyword/secret inputs stay above the keyboard on both platforms. */}
      <KeyboardSafeModalSheet
        visible={modalVisible}
        onClose={closeModal}
        onRequestClose={closeModal}
        centered
        animationType="fade"
        dismissOnBackdropPress={false}
        contentContainerStyle={styles.modalPadding}
        sheetStyle={styles.modalCard}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="warning-outline" size={28} color="#e74c3c" />
        </View>
        <LocalizedText role="sectionTitle" center style={styles.modalTitle}>
          {t("deleteAccount.title")}
        </LocalizedText>
            <LocalizedText role="description" center style={styles.modalBody}>
              {t("deleteAccount.warning")}
            </LocalizedText>

            {/* Path B: active store-subscription warning + deep link (§4.2).
                Store names inside the Arabic body are LRI/PDI-isolated in
                the translation itself (blueprint §6). */}
            {info?.hasActiveStoreSubscription ? (
              <View style={styles.warningBox}>
                <LocalizedText
                  role="label"
                  center
                  style={styles.warningTitle}
                >
                  {t("deleteAccount.storeWarnTitle")}
                </LocalizedText>
                <LocalizedText
                  role="hint"
                  center
                  style={styles.warningBody}
                >
                  {t("deleteAccount.storeWarnBody")}
                </LocalizedText>
                <TouchableOpacity onPress={openStoreManager} activeOpacity={0.7}>
                  <LocalizedText role="label" center style={styles.link}>
                    {t("deleteAccount.manageSubscription")}
                  </LocalizedText>
                </TouchableOpacity>
              </View>
            ) : null}

            {retentionText ? (
              // Backend-authored retention copy: mixed-script user/backend
              // content → first-strong direction with isolation.
              <AdaptiveText style={styles.retention}>
                {retentionText}
              </AdaptiveText>
            ) : null}

            <LocalizedText role="label" style={styles.confirmLabel}>
              {t("deleteAccount.confirmLabel", { keyword })}
            </LocalizedText>
            {/* Keyword mirrors the localized confirm copy, so its direction
                follows the UI locale rather than the autoCapitalize hint. */}
            <TextInput
              style={styles.input}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder={keyword}
              placeholderTextColor="#bbb"
              contentDirection="localized"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />

            {/* Reauthentication (§4.1): password or OTP — secrets/OTP stay
                intrinsically LTR; labels remain localized chrome. */}
            {reauthMethod === "otp" ? (
              <>
                <LocalizedText role="label" style={styles.confirmLabel}>
                  {t("deleteAccount.otpLabel")}
                </LocalizedText>
                {otpSent ? (
                  <TextInput
                    style={styles.input}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder={t("deleteAccount.otpPlaceholder")}
                    placeholderTextColor="#bbb"
                    keyboardType="number-pad"
                    contentDirection="ltr"
                    autoCorrect={false}
                    editable={!loading}
                  />
                ) : (
                  <TouchableOpacity
                    style={[styles.sendCodeBtn, sendingOtp && styles.confirmBtnDisabled]}
                    onPress={sendOtp}
                    disabled={sendingOtp}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t("deleteAccount.sendCode")}
                  >
                    {sendingOtp ? (
                      <ActivityIndicator size="small" color="#c28e5c" />
                    ) : (
                      <LocalizedText role="label" style={styles.sendCodeText}>
                        {t("deleteAccount.sendCode")}
                      </LocalizedText>
                    )}
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <LocalizedText role="label" style={styles.confirmLabel}>
                  {t("deleteAccount.passwordLabel")}
                </LocalizedText>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("deleteAccount.passwordPlaceholder")}
                  placeholderTextColor="#bbb"
                  secureTextEntry
                  contentDirection="ltr"
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
                <LocalizedText role="label" style={styles.cancelText}>
                  {t("deleteAccount.cancel")}
                </LocalizedText>
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
                  <LocalizedText role="label" style={styles.confirmText}>
                    {t("deleteAccount.confirm")}
                  </LocalizedText>
                )}
              </TouchableOpacity>
            </View>
      </KeyboardSafeModalSheet>
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
  modalCard: {
    width: "100%",
    maxWidth: 420,
  },
  modalPadding: {
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
