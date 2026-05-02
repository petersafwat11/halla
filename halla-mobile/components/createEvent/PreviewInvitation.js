import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PreviewInvitation = ({
  visible = false,
  onClose,
  eventTitle = "",
  invitationMessage = "",
  templateImage = null,
  templateData = {},
  selectedTemplate = null,
  eventDate = null,
  eventTime = "",
  location = "",
}) => {
  // Format date for display
  const formattedDate = useMemo(() => {
    if (!eventDate) return "";
    try {
      const date = new Date(eventDate);
      return date.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "";
    }
  }, [eventDate]);

  // Generate title from bride and groom names or use event title
  const displayTitle = useMemo(() => {
    const brideName = templateData?.brideName;
    const groomName = templateData?.groomName;
    if (brideName && groomName) {
      return `حفل زفاف ${brideName} و${groomName}`;
    }
    return eventTitle || "عنوان المناسبة";
  }, [templateData, eventTitle]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>معاينة الدعوة</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#2C2C2C" />
            </TouchableOpacity>
          </View>

          {/* WhatsApp Preview */}
          <ScrollView
            style={styles.previewContainer}
            contentContainerStyle={styles.previewContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Chat Bubble */}
            <View style={styles.chatBubble}>
              {/* Template Image */}
              <Image
                source={
                  templateImage && typeof templateImage === "string"
                    ? { uri: templateImage }
                    : require("../../assets/invetation.png")
                }
                style={styles.templateImage}
                resizeMode="cover"
                defaultSource={require("../../assets/invetation.png")}
                onError={(error) => {
                  console.log("Image load error:", error.nativeEvent.error);
                }}
              />

              {/* Event Details */}
              <View style={styles.eventDetails}>
                {/* Title */}
                {displayTitle && (
                  <Text style={styles.eventTitle}>{displayTitle}</Text>
                )}

                {/* Invitation Message */}
                {invitationMessage && (
                  <Text style={[styles.invitationMessage]}>
                    {invitationMessage}
                  </Text>
                )}

                {/* Date */}
                {formattedDate && (
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#656565"
                    />
                    <Text style={styles.detailText}>
                      بتاريخ {formattedDate}
                    </Text>
                  </View>
                )}

                {/* Time */}
                {eventTime && (
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color="#656565" />
                    <Text style={styles.detailText}>الساعة {eventTime}</Text>
                  </View>
                )}

                {/* Location */}
                {location && (
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="#656565"
                    />
                    <Text style={styles.detailText}>{location}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonText}>تفاصيل المناسبة</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.confirmButton]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.actionButtonText, styles.confirmButtonText]}
                  >
                    سأحضر
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonText}>سأعتذر</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonText}>ربما</Text>
                </TouchableOpacity>
              </View>

              {/* Timestamp */}
              <Text style={styles.timestamp}>10:30 صباحًا</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 500,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  previewContainer: {
    flex: 1,
  },
  previewContent: {
    padding: 20,
    backgroundColor: "#E5DDD5", // WhatsApp background color
  },
  chatBubble: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  templateImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#F5F5F5",
  },
  placeholderImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#F9F4EF",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: "Cairo_500Medium",
    color: "#C28E5C",
  },
  eventDetails: {
    padding: 16,
    gap: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    textAlign: "center",
    marginBottom: 4,
  },
  invitationMessage: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    lineHeight: 24,
    textAlign: "center",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    flex: 1,
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
    minWidth: "48%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButton: {
    backgroundColor: "#C28E5C",
  },
  actionButtonText: {
    fontSize: 13,
    fontFamily: "Cairo_500Medium",
    color: "#2C2C2C",
  },
  confirmButtonText: {
    color: "#FFF",
  },
  timestamp: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#8E8E8E",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});

export default PreviewInvitation;
