import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

const WhatsAppInvitationPreview = ({ eventName, templateImage, selectedTemplate, invitationText, t }) => {

  return (
    <View style={styles.invitationSection}>
      <Text style={styles.sectionTitle}>{t("summary.invitationPreview.title")}</Text>

      <View style={styles.waBubbleWrapper}>
        <View style={styles.waBubble}>
          {templateImage ? (
            <Image source={{ uri: templateImage }} style={styles.waImage} resizeMode="cover" />
          ) : (
            <View style={styles.waImagePlaceholder}>
              <Text style={styles.waPlaceholderEmoji}>🎉</Text>
              <Text style={styles.waPlaceholderText}>
                {selectedTemplate ? t("summary.invitationPreview.whatsappTemplate") : t("summary.invitationPreview.noImageSelected")}
              </Text>
            </View>
          )}

          <View style={styles.waBody}>
            <Text style={styles.waEventName}>{eventName}</Text>

            {invitationText ? (
              <Text style={styles.waMessage}>{invitationText}</Text>
            ) : (
              <Text style={styles.waMessageEmpty}>{t("summary.invitationPreview.noTemplateSelected")}</Text>
            )}

            {selectedTemplate && (
              <View style={styles.waTemplateBadge}>
                <Text style={styles.waTemplateBadgeText}>
                  ✓ {selectedTemplate.name}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.waActions}>
            <View style={styles.waAction}>
              <Text style={styles.waActionTextPrimary}>{t("summary.invitationPreview.attending")}</Text>
            </View>
            <View style={styles.waActionDivider} />
            <View style={styles.waAction}>
              <Text style={styles.waActionText}>{t("summary.invitationPreview.declining")}</Text>
            </View>
            <View style={styles.waActionDivider} />
            <View style={styles.waAction}>
              <Text style={styles.waActionText}>{t("summary.invitationPreview.maybe")}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  invitationSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#2C2C2C", marginBottom: 10 },
  waBubbleWrapper: { backgroundColor: "#E5DDD5", borderRadius: 12, padding: 12 },
  waBubble: { backgroundColor: "#FFF", borderRadius: 8, overflow: "hidden" },
  waImage: { width: "100%", height: 180, backgroundColor: "#F5F5F5" },
  waImagePlaceholder: { width: "100%", height: 120, backgroundColor: "#F9F4EF", alignItems: "center", justifyContent: "center", gap: 6 },
  waPlaceholderEmoji: { fontSize: 32 },
  waPlaceholderText: { fontSize: 12, fontFamily: "Cairo_500Medium", color: "#C28E5C" },
  waBody: { padding: 14, gap: 6 },
  waEventName: { fontSize: 15, fontFamily: "Cairo_700Bold", color: "#2C2C2C", textAlign: "right", marginBottom: 4 },
  waMessage: { fontSize: 13, fontFamily: "Cairo_400Regular", color: "#2C2C2C", lineHeight: 22, textAlign: "right" },
  waMessageEmpty: { fontSize: 12, fontFamily: "Cairo_400Regular", color: "#999", textAlign: "right", fontStyle: "italic", lineHeight: 18 },
  waTemplateBadge: { marginTop: 6, alignSelf: "flex-end", backgroundColor: "#F5ECE4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  waTemplateBadgeText: { fontSize: 11, fontFamily: "Cairo_600SemiBold", color: "#C28E5C" },
  waActions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#F0F0F0" },
  waAction: { flex: 1, paddingVertical: 10, alignItems: "center" },
  waActionDivider: { width: 1, backgroundColor: "#F0F0F0" },
  waActionTextPrimary: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: "#C28E5C" },
  waActionText: { fontSize: 13, fontFamily: "Cairo_500Medium", color: "#656565" },
});

export default WhatsAppInvitationPreview;
