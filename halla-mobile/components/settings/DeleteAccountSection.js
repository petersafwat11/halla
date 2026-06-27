/**
 * Self-service "Delete account" entry point.
 *
 * Required by Apple (Guideline 5.1.1(v)) and Google Play's data-deletion
 * policy for any app that supports account creation. Rendered on every
 * role's Settings screen (host, vendor, admin) so deletion is always
 * reachable in-app.
 *
 * Flow: destructive button -> confirmation modal with a type-to-confirm
 * guard (the user must type the localized keyword) -> backend deletion
 * (PII anonymized + owned data cascaded + tokens revoked) -> local session
 * wipe via authStore.logout(), which drops the user back to the auth stack.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { useDeleteAccount } from "../../hooks";

const DeleteAccountSection = () => {
  const { t } = useTranslation("settings");
  const toast = useToast();
  const logout = useAuthStore((state) => state.logout);
  const deleteAccount = useDeleteAccount();

  const [modalVisible, setModalVisible] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const keyword = t("deleteAccount.confirmKeyword");
  const canDelete =
    confirmText.trim().toLowerCase() === keyword.trim().toLowerCase();
  const loading = deleteAccount.isPending;

  const closeModal = useCallback(() => {
    if (loading) return;
    setModalVisible(false);
    setConfirmText("");
  }, [loading]);

  const handleConfirm = useCallback(async () => {
    if (!canDelete || loading) return;
    try {
      await deleteAccount.mutateAsync();
      // Wipe the local session; the root navigator switches to AuthStack.
      await logout();
      toast.success(t("deleteAccount.success"));
    } catch (error) {
      toast.error(error?.message || t("deleteAccount.error"));
    }
  }, [canDelete, loading, deleteAccount, logout, toast, t]);

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
    marginBottom: 20,
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
    marginBottom: 20,
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
