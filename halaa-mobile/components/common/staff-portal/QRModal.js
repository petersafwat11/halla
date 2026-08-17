import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const QRModal = ({ visible, onClose, onSubmit, t }) => {
  const [code, setCode] = useState("");

  const handleSubmit = () => {
    if (!code.trim()) return;
    onSubmit(code.trim());
    setCode("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("checkIn.qrTitle")}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color="#2C2C2C" />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>{t("checkIn.qrLabel")}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="qr-code-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { writingDirection: "ltr" }]}
                placeholder={t("checkIn.qrPlaceholder")}
                placeholderTextColor="#9CA3AF"
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity
              style={[styles.verifyBtn, { marginTop: 16 }]}
              onPress={handleSubmit}
              disabled={!code.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.verifyBtnText}>{t("checkIn.qrButton")}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
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
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    paddingVertical: 10,
  },
  verifyBtn: {
    backgroundColor: "#C28E5C",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBtnText: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
  },
});

export default QRModal;
