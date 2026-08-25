import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import KeyboardSafeModalSheet from "../../commen/keyboard/KeyboardSafeModalSheet";
import TextInput from "../../commen/DirectionalTextInput";

const QRModal = ({ visible, onClose, onSubmit, t }) => {
  const [code, setCode] = useState("");

  const handleSubmit = () => {
    if (!code.trim()) return;
    onSubmit(code.trim());
    setCode("");
    onClose();
  };

  return (
    // Small bottom card (§6.4): the shared avoiding owner keeps the code
    // input and verify action above the keyboard on both platforms.
    <KeyboardSafeModalSheet
      visible={visible}
      onClose={onClose}
      onRequestClose={onClose}
      header={
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t("checkIn.qrTitle")}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color="#2C2C2C" />
          </TouchableOpacity>
        </View>
      }
      footer={
        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={handleSubmit}
          disabled={!code.trim()}
          activeOpacity={0.85}
        >
          <Text style={styles.verifyBtnText}>{t("checkIn.qrButton")}</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.modalCard}>
        <Text style={styles.fieldLabel}>{t("checkIn.qrLabel")}</Text>
        <View style={styles.inputRow}>
          <Ionicons name="qr-code-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            contentDirection="ltr"
            placeholder={t("checkIn.qrPlaceholder")}
            placeholderTextColor="#9CA3AF"
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
          />
        </View>
      </View>
    </KeyboardSafeModalSheet>
  );
};

const styles = StyleSheet.create({
  modalCard: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
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
  inputIcon: { marginEnd: 8 },
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
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 8,
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
