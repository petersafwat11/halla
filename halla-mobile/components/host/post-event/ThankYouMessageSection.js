import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ThankYouMessageSection = ({
  message,
  onChangeMessage,
  onSave,
  saving,
  saved,
  t,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{t("host.thankYouMessage.title")}</Text>
    <TextInput
      style={styles.messageInput}
      value={message}
      onChangeText={onChangeMessage}
      multiline
      numberOfLines={4}
      placeholder={t("host.thankYouMessage.placeholder")}
      placeholderTextColor="#B0B0B0"
      textAlign="right"
      textAlignVertical="top"
    />
    <TouchableOpacity
      style={[styles.saveButton, saved && styles.savedButton]}
      onPress={onSave}
      disabled={saving}
      activeOpacity={0.7}
    >
      {saving ? (
        <ActivityIndicator size={14} color="#FFF" />
      ) : (
        <Ionicons
          name={saved ? "checkmark" : "save-outline"}
          size={14}
          color="#FFF"
        />
      )}
      <Text style={styles.saveButtonText}>{t("host.thankYouMessage.save")}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#FFF", borderRadius: 12, padding: 16, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#2C2C2C" },
  messageInput: {
    borderWidth: 1, borderColor: "#E0D5CC", borderRadius: 8, padding: 12,
    minHeight: 100, fontSize: 14, fontFamily: "Cairo_400Regular",
    color: "#2C2C2C", backgroundColor: "#F9F4EF",
  },
  saveButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#C28E5C", paddingVertical: 10, borderRadius: 8,
  },
  savedButton: { backgroundColor: "#2A8C5B" },
  saveButtonText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: "#FFF" },
});

export default ThankYouMessageSection;
