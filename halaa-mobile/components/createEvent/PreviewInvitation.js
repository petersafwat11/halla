import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  resolveTaqnyatPlaceholders,
  buildTaqnyatPreviewContext,
  formatDate,
} from "@halaa/shared/utils";
import { isolateAuto, isolateLtr } from "@halaa/shared/utils/bidi";
import { useTranslation } from "../../localization";
import { useAuthStore } from "../../stores/authStore";
import TemplatePreviewCanvas from "../shared/TemplatePreviewCanvas";
import { resolveMediaUri } from "../../utils/resolveMediaUri";
import DirectionalIonicon from "../common/DirectionalIonicon";
import { useFieldDirection, useInputDirection } from "../../hooks/useInputDirection";
import {
  DEFAULT_INVITATION_TYPE,
  invitationAllowsReply,
} from "../../utils/invitationTypes";

/**
 * Invitation preview popup. Renders the message exactly as web's
 * WhatsappPreview does — a WhatsApp conversation with the customised template
 * image (4:5), the resolved message body, a timestamp with the blue
 * double-check, and the three quick-reply CTA buttons. Web is the source of
 * truth; the only deliberate deviation is omitting web's fake iOS device
 * bezel/notch/status-bar (redundant inside a real phone).
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
  invitationType = DEFAULT_INVITATION_TYPE,
}) => {
  const { t, currentLanguage } = useTranslation("createEvent");
  const fieldDirection = useFieldDirection("localized");
  const brandDirection = useInputDirection("ltr");
  const hostName = useAuthStore(
    (state) => state.user?.name || state.user?.username || ""
  );

  const formattedDate = useMemo(() => {
    if (!eventDate) return "";
    return formatDate(eventDate, currentLanguage || "ar");
  }, [eventDate, currentLanguage]);

  const resolvedBody = useMemo(() => {
    if (!previewBody) return "";
    const context = buildTaqnyatPreviewContext({
      guestName: t("preview_guest_placeholder"),
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

  const bakedImageSource = useMemo(() => {
    if (!templateImage) return null;
    if (typeof templateImage === "number") return templateImage;
    if (templateImage.src && typeof templateImage.src === "number") return templateImage.src;
    const uri = resolveMediaUri(templateImage);
    return uri ? { uri } : null;
  }, [templateImage]);

  const aspectRatio = useMemo(() => {
    if (template?.naturalWidth && template?.naturalHeight) {
      return template.naturalWidth / template.naturalHeight;
    }
    if (templateImage?.width && templateImage?.height) {
      return templateImage.width / templateImage.height;
    }
    return 4 / 5;
  }, [template, templateImage]);

  const messageTime = t("preview_timestamp");
  const showReplyActions = invitationAllowsReply(invitationType);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
        {/* Screen header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, fieldDirection.text]}>
            {t("preview_title")}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#2C2C2C" />
          </TouchableOpacity>
        </View>

        {/* WhatsApp top bar */}
        <View style={styles.waBar}>
          <DirectionalIonicon name="chevron-back" size={22} color="#FFF" />
          <View style={styles.waAvatar}>
            <Text style={[styles.waAvatarText, brandDirection]}>H</Text>
          </View>
          <View style={styles.waInfo}>
            <Text style={[styles.waName, brandDirection]} numberOfLines={1}>
              Halaa Events
            </Text>
            <Text style={[styles.waStatus, brandDirection]}>online</Text>
          </View>
          <Ionicons name="ellipsis-vertical" size={18} color="#FFF" />
        </View>

        {/* Chat area */}
        <ScrollView
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Received message card */}
          <View style={styles.msgCard}>
            <View style={styles.msgImageWrap}>
              {bakedImageSource ? (
                <Image
                  source={bakedImageSource}
                  style={styles.templateImage}
                  resizeMode="cover"
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
                  resizeMode="cover"
                />
              )}
            </View>

            {resolvedBody ? (
              <Text style={[styles.msgBody, fieldDirection.text]}>
                {isolateAuto(resolvedBody)}
              </Text>
            ) : (
              <Text style={[styles.msgPlaceholder, fieldDirection.text]}>
                {t("preview_body_placeholder")}
              </Text>
            )}

            <View style={styles.msgMeta}>
              <Text style={styles.msgTime}>{isolateLtr(messageTime)}</Text>
              <Ionicons name="checkmark-done" size={15} color="#53BDEB" />
            </View>
          </View>

        </ScrollView>

          {/* Quick-reply CTA buttons stay visible below long message content. */}
          {showReplyActions && <View style={styles.ctaGroup}>
            <View style={styles.ctaBtn}>
              <Ionicons name="checkmark-sharp" size={15} color="#0096DE" />
              <Text style={styles.ctaText}>
                {t("whatsapp_invitation_preview_attending")}
              </Text>
            </View>
            <View style={styles.ctaDivider} />
            <View style={styles.ctaBtn}>
              <Ionicons name="close-sharp" size={15} color="#0096DE" />
              <Text style={styles.ctaText}>
                {t("whatsapp_invitation_preview_declining")}
              </Text>
            </View>
          </View>}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputField}>
            <Text style={[styles.inputPlaceholder, fieldDirection.text]}>
              {t("preview_input_placeholder")}
            </Text>
          </View>
          <View style={styles.micBtn}>
            <Ionicons name="mic" size={18} color="#FFF" />
          </View>
        </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  /* Dimmed backdrop + centered popup card (no longer full-screen) */
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  card: {
    height: "82%",
    backgroundColor: "#EFEAE2",
    borderRadius: 18,
    overflow: "hidden",
  },

  /* Screen header */
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
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },

  /* WhatsApp top bar */
  waBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#00A884",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  waAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  waAvatarText: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    color: "#00785A",
  },
  waInfo: { flex: 1, minWidth: 0 },
  waName: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    lineHeight: 18,
  },
  waStatus: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    lineHeight: 14,
  },

  /* Chat area */
  chatArea: { flex: 1, backgroundColor: "#EFEAE2" },
  chatContent: { padding: 14, gap: 8 },

  /* Message card */
  msgCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderTopStartRadius: 4,
    overflow: "hidden",
    shadowColor: "#0B141A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    padding: 4,
  },
  msgImageWrap: {
    width: "100%",
    height: 300,
    backgroundColor: "#F1E8D6",
    overflow: "hidden",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  templateImage: { width: "100%", height: "100%" },
  msgBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 2,
    color: "#111B21",
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    lineHeight: 24,
  },
  msgPlaceholder: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 2,
    color: "#8696A0",
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    lineHeight: 20,
    fontStyle: "italic",
  },
  msgMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 8,
  },
  msgTime: {
    color: "#667781",
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
  },

  /* CTA buttons */
  ctaGroup: {
    alignSelf: "stretch",
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: "#FFF",
    borderRadius: 9,
    overflow: "hidden",
    shadowColor: "#0B141A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
    flexShrink: 0,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  ctaText: {
    color: "#027EB5",
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
  },
  ctaDivider: { height: 1, backgroundColor: "#E9EDEF" },

  /* Input bar */
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 9,
    paddingVertical: 8,
    backgroundColor: "#F0F2F5",
  },
  inputField: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  inputPlaceholder: {
    color: "#8696A0",
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#00A884",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default PreviewInvitation;
