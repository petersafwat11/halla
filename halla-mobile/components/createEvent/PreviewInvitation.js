import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  resolveTaqnyatPlaceholders,
  buildTaqnyatPreviewContext,
} from "@halla/shared/utils";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import TemplatePreviewCanvas from "../shared/TemplatePreviewCanvas";

/**
 * Invitation preview popup. Renders a WhatsApp-style bubble with the
 * customised template image (preferred) or, if available, a live
 * `TemplatePreviewCanvas` rendered from the picked template + overlay data.
 *
 * Mirrors the data shape used by the web `WhatsappPreview` so the
 * call site (`StepThree` / `StepFour`) can pass the same props.
 */
const PreviewInvitation = ({
  visible = false,
  onClose,
  eventTitle = "",
  previewBody = "",
  templateImage = null,
  templateData = {},
  template = null,
  // Selected Taqnyat template carries the `varMapping` curated by admins.
  // When provided, `previewBody` placeholders are resolved against event
  // data so the preview matches what the guest will see at send time.
  selectedTemplate = null,
  eventDate = null,
  eventTime = "",
  location = "",
}) => {
  const { t } = useTranslation("createEvent");
  const hostName = useAuthStore(
    (state) => state.user?.name || state.user?.username || ""
  );

  const formattedDate = useMemo(() => {
    if (!eventDate) return "";
    try {
      return new Date(eventDate).toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }, [eventDate]);

  const resolvedBody = useMemo(() => {
    if (!previewBody) return "";
    const context = buildTaqnyatPreviewContext({
      guestName: t("preview_guest_placeholder", "ضيفنا الكريم"),
      eventTitle,
      dateFormatted: formattedDate,
      eventTime,
      locationAddress: location || "",
      hostName,
    });
    return resolveTaqnyatPlaceholders(
      previewBody,
      selectedTemplate?.varMapping,
      context
    );
  }, [
    previewBody,
    selectedTemplate?.varMapping,
    eventTitle,
    formattedDate,
    eventTime,
    location,
    hostName,
    t,
  ]);

  const displayTitle = useMemo(() => {
    const brideName = templateData?.brideName;
    const groomName = templateData?.groomName;
    if (brideName && groomName) {
      return t("preview_wedding_title", { brideName, groomName });
    }
    return eventTitle || t("preview_default_title");
  }, [templateData, eventTitle, t]);

  const bakedImageSource = useMemo(() => {
    if (!templateImage) return null;
    if (typeof templateImage === "string") return { uri: templateImage };
    if (typeof templateImage === "object" && templateImage.uri) {
      return { uri: templateImage.uri };
    }
    return null;
  }, [templateImage]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("preview_title")}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#2C2C2C" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.previewContainer}
          contentContainerStyle={styles.previewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Chat Bubble */}
          <View style={styles.chatBubble}>
            <View style={styles.templateImageWrap}>
              {bakedImageSource ? (
                <Image
                  source={bakedImageSource}
                  style={styles.templateImage}
                  resizeMode="contain"
                  onError={() => {}}
                />
              ) : template ? (
                <TemplatePreviewCanvas
                  template={template}
                  data={templateData}
                  primaryColor={templateData?.primaryColor}
                />
              ) : (
                <Image
                  source={require("../../assets/invetation.png")}
                  style={styles.templateImage}
                  resizeMode="contain"
                />
              )}
            </View>

            <View style={styles.eventDetails}>
              {!!displayTitle && (
                <Text style={styles.eventTitle}>{displayTitle}</Text>
              )}

              {!!resolvedBody && (
                <Text style={styles.invitationMessage}>{resolvedBody}</Text>
              )}

              {!!formattedDate && (
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color="#656565" />
                  <Text style={styles.detailText}>
                    {t("preview_date_prefix")} {formattedDate}
                  </Text>
                </View>
              )}

              {!!eventTime && (
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color="#656565" />
                  <Text style={styles.detailText}>
                    {t("time_prefix")} {eventTime}
                  </Text>
                </View>
              )}

              {!!location && (
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color="#656565" />
                  <Text style={styles.detailText}>{location}</Text>
                </View>
              )}
            </View>

            <View style={styles.actionButtons}>
              <View style={[styles.actionButton, styles.confirmButton]}>
                <Text style={[styles.actionButtonText, styles.confirmButtonText]}>
                  {t("whatsapp_invitation_preview_attending", t("attending"))}
                </Text>
              </View>
              <View style={styles.actionButton}>
                <Text style={styles.actionButtonText}>
                  {t("whatsapp_invitation_preview_declining", t("absence"))}
                </Text>
              </View>
              <View style={styles.actionButton}>
                <Text style={styles.actionButtonText}>
                  {t("whatsapp_invitation_preview_maybe", t("maybe"))}
                </Text>
              </View>
            </View>

            <Text style={styles.timestamp}>{t("preview_timestamp")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: "#E5DDD5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#FFF",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    flex: 1,
    textAlign: "right",
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  previewContainer: { flex: 1 },
  previewContent: { padding: 16 },
  chatBubble: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  templateImageWrap: {
    width: "100%",
    aspectRatio: 4 / 5,
    backgroundColor: "#F5F1EA",
    overflow: "hidden",
  },
  templateImage: { width: "100%", height: "100%" },
  eventDetails: { padding: 16, gap: 10 },
  eventTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "center",
  },
  invitationMessage: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    lineHeight: 22,
    textAlign: "center",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  detailText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    flex: 1,
    textAlign: "right",
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  actionButton: {
    flex: 1,
    minWidth: "30%",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButton: { backgroundColor: "#C28E5C" },
  actionButtonText: {
    fontSize: 12,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
  confirmButtonText: { color: "#FFF" },
  timestamp: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#8E8E8E",
    paddingHorizontal: 16,
    paddingBottom: 10,
    textAlign: "left",
  },
});

export default PreviewInvitation;
