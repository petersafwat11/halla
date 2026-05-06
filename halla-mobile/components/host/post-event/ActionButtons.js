import React from "react";
import { View, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ActionButtons = ({ isPublished, publishing, resending, onPublish, onResend, t }) => (
  <View style={styles.actionsSection}>
    {!isPublished ? (
      <TouchableOpacity
        style={[styles.publishButton, publishing && styles.disabledButton]}
        onPress={onPublish}
        disabled={publishing}
        activeOpacity={0.7}
      >
        {publishing ? (
          <ActivityIndicator size={16} color="#FFF" />
        ) : (
          <Ionicons name="send-outline" size={16} color="#FFF" />
        )}
        <Text style={styles.publishButtonText}>
          {publishing
            ? t("hostPostEvent.actions.publishing", "جاري النشر...")
            : t("hostPostEvent.actions.publish", "نشر وإرسال للضيوف")}
        </Text>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        style={[styles.resendButton, resending && styles.disabledButton]}
        onPress={onResend}
        disabled={resending}
        activeOpacity={0.7}
      >
        {resending ? (
          <ActivityIndicator size={16} color="#C28E5C" />
        ) : (
          <Ionicons name="refresh-outline" size={16} color="#C28E5C" />
        )}
        <Text style={styles.resendButtonText}>
          {resending
            ? t("hostPostEvent.actions.resending", "جاري الإرسال...")
            : t("hostPostEvent.actions.resend", "إعادة إرسال الروابط")}
        </Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  actionsSection: { gap: 10 },
  publishButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#C28E5C", paddingVertical: 14, borderRadius: 10,
  },
  publishButtonText: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#FFF" },
  resendButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#FFF", paddingVertical: 14, borderRadius: 10,
    borderWidth: 1, borderColor: "#C28E5C",
  },
  resendButtonText: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#C28E5C" },
  disabledButton: { opacity: 0.6 },
});

export default ActionButtons;
