import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Modal,
  Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage, useTranslation } from "../../localization";
import { getStatusVisual } from "../../constants/statusColors";
import { getImageUrl } from "../../utils/imageUtils";
import LocalizedText from "../commen/LocalizedText";
import AdaptiveText from "../commen/AdaptiveText";
import { formatDateTime } from "@halaa/shared/utils/locale";
import { isolateAuto } from "@halaa/shared/utils/bidi";

const TicketCard = ({ ticket, onDelete, onEdit, onRate, index }) => {
  const { t, currentLanguage } = useTranslation("tickets");

  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const [imageViewerVisible, setImageViewerVisible] = React.useState(false);

  const attachment = ticket.attachment;

  const handleOpenVideo = () => {
    if (attachment?.url) {
      Linking.openURL(attachment.url).catch(() => {});
    }
  };

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 100,
      tension: 50,
      friction: 7,
      useNativeDriver: true
    }).start();
  }, []);

  const formattedDate = formatDateTime(ticket.createdAt, currentLanguage, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const { fg: statusFg, bg: statusBg } = getStatusVisual(ticket.status);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] }]}
    >
      {/* Top Section: Status and Actions */}
      <View style={styles.top}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusBg }]}
        >
          <LocalizedText style={[styles.statusText, { color: statusFg }]}>
            {t(`status.${ticket.status}`)}
          </LocalizedText>
        </View>

        <View style={styles.actions}>
          {ticket.status === "open" && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit(ticket)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color="#3498db" />
                  <LocalizedText style={[styles.actionText, styles.editText]}>
                    {t("actions.edit")}
                  </LocalizedText>
            </TouchableOpacity>
          )}

          {(ticket.status === "resolved" || ticket.status === "closed") &&
            !ticket.userRating?.rating && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onRate && onRate(ticket)}
                activeOpacity={0.7}
              >
                <Ionicons name="star-outline" size={16} color="#f39c12" />
                <LocalizedText style={[styles.actionText, styles.rateText]}>
                  {t("ratingInline.rateButton")}
                </LocalizedText>
              </TouchableOpacity>
            )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onDelete(ticket.id || ticket._id)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color="#e74c3c" />
            <LocalizedText style={[styles.actionText, styles.deleteText]}>
              {t("actions.delete")}
            </LocalizedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Type */}
      <LocalizedText style={styles.type}>
        {t(`types.${ticket.type}`)}
      </LocalizedText>

      {/* Subject */}
      <LocalizedText style={styles.subject} numberOfLines={2}>
        {ticket.subject}
      </LocalizedText>

      {/* Bottom Section: Date and Message */}
      <View style={styles.bottom}>
        <View style={styles.dateContainer}>
          <LocalizedText style={styles.createdLabel}>
            {t("createdAt")}
          </LocalizedText>
          {/* First-strong isolation: the formatted value is Arabic script in
              Arabic UI and Latin in English UI — an LTR isolate would force a
              wrong base direction around the Arabic date/time segments. */}
          <Text style={styles.date}>{isolateAuto(formattedDate)}</Text>
        </View>

        <AdaptiveText
          style={styles.message}
          numberOfLines={2}
        >
          {ticket.message}
        </AdaptiveText>
      </View>

      {/* Attachment (image thumbnail -> viewer, or video -> open in browser) */}
      {attachment && (
        <View style={styles.attachmentRow}>
          {attachment.type === "image" ? (
            <TouchableOpacity
              style={styles.attachmentThumbWrap}
              onPress={() => setImageViewerVisible(true)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: getImageUrl(attachment.url) }}
                style={styles.attachmentThumb}
              />
              <View style={styles.attachmentThumbOverlay}>
                <Ionicons name="expand-outline" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.attachmentVideoThumb}
              onPress={handleOpenVideo}
              activeOpacity={0.8}
            >
              <Ionicons name="videocam" size={24} color="#c28e5c" />
              <View style={styles.attachmentPlayBadge}>
                <Ionicons name="play" size={11} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
          <LocalizedText style={styles.attachmentLabel}>
            {attachment.type === "image"
              ? t("card.viewAttachment")
              : t("card.playVideo")}
          </LocalizedText>
        </View>
      )}

      {/* Existing rating display */}
      {ticket.userRating?.rating > 0 && (
        <View style={styles.ratingRow}>
          {/* Physical star geometry (1→5) is intentional — see
              TicketRatingModal; must not mirror with the locale. */}
          <View style={[styles.ratingStars, styles.ratingStarsDirection]}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons
                key={i}
                name={i <= ticket.userRating.rating ? "star" : "star-outline"}
                size={14}
                color="#f39c12"
              />
            ))}
          </View>
          <LocalizedText style={styles.ratedLabel}>
            {t("ratingInline.alreadyRated")}
          </LocalizedText>
        </View>
      )}

      {/* Full-screen image preview */}
      {attachment?.type === "image" && (
        <Modal
          visible={imageViewerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImageViewerVisible(false)}
        >
          <TouchableOpacity
            style={styles.viewerOverlay}
            activeOpacity={1}
            onPress={() => setImageViewerVisible(false)}
          >
            <Image
              source={{ uri: getImageUrl(attachment.url) }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.viewerClose}
              onPress={() => setImageViewerVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },  statusText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold"
  },
  actions: {
    flexDirection: "row",
    gap: 12
  },  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },  actionText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold"
  },
  editText: {
    color: "#3498db"
  },
  rateText: {
    color: "#f39c12"
  },
  deleteText: {
    color: "#e74c3c"
  },
  type: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    marginBottom: 4
  },
  subject: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#444",
    marginBottom: 12
  },  bottom: {
    gap: 8
  },  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },  createdLabel: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#666"
  },  date: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#666"
  },  time: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#999"
  },  message: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#666",
    lineHeight: 20
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  ratingStars: {
    flexDirection: "row",
    gap: 2,
  },
  // Intentional physical 1→5 numeric scale — pinned LTR in every locale.
  ratingStarsDirection: {
    direction: "ltr",
  },
  ratedLabel: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#f39c12",
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  attachmentThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  attachmentThumb: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    backgroundColor: "#eee",
  },
  attachmentThumbOverlay: {
    position: "absolute",
    end: 4,
    bottom: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentVideoThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#f5ece4",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  attachmentPlayBadge: {
    position: "absolute",
    end: 4,
    bottom: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#c28e5c",
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerImage: {
    width: "100%",
    height: "80%",
  },
  viewerClose: {
    position: "absolute",
    top: 48,
    end: 24,
  },
});

export default TicketCard;
