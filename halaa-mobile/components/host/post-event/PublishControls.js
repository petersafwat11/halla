import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Bottom action group for the host post-event screen. When the content
 * is unpublished only the primary "Publish" CTA renders; once published
 * the host can either resend access links or unpublish (which revokes
 * every guest token in one shot).
 */
const PublishControls = ({
  isPublished,
  publishing,
  unpublishing,
  onPublish,
  onOpenAccessLinks,
  onUnpublish,
  t,
}) => {
  if (!isPublished) {
    return (
      <View style={styles.actionsSection}>
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
          <Text style={styles.publishButtonText}>{t("host.publish")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.actionsSection}>
      <TouchableOpacity
        style={styles.resendButton}
        onPress={onOpenAccessLinks}
        activeOpacity={0.7}
      >
        <Ionicons name="refresh-outline" size={16} color="#C28E5C" />
        <Text style={styles.resendButtonText}>
          {t("host.accessLinks.title")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.unpublishButton,
          unpublishing && styles.disabledButton,
        ]}
        onPress={onUnpublish}
        disabled={unpublishing}
        activeOpacity={0.7}
      >
        {unpublishing ? (
          <ActivityIndicator size={16} color="#C28E5C" />
        ) : (
          <Ionicons name="lock-closed-outline" size={16} color="#C28E5C" />
        )}
        <Text style={styles.unpublishButtonText}>{t("host.unpublish")}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsSection: { gap: 10 },
  publishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C28E5C",
    paddingVertical: 14,
    borderRadius: 10,
  },
  publishButtonText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C28E5C",
  },
  resendButtonText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#C28E5C",
  },
  unpublishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C28E5C",
  },
  unpublishButtonText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#C28E5C",
  },
  disabledButton: { opacity: 0.6 },
});

export default PublishControls;
