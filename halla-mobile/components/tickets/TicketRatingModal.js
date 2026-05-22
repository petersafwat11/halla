import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { useRateTicket } from "../../hooks";
import { useToast } from "../../contexts/ToastContext";

const RATING_LABEL_KEYS = ["veryPoor", "poor", "average", "good", "excellent"];

const TicketRatingModal = ({ visible, onClose, ticket }) => {
  const { t } = useTranslation("ticketRating");
  const { t: tTickets } = useTranslation("tickets");
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [ratingError, setRatingError] = useState("");

  const slideAnim = React.useRef(new Animated.Value(300)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const rateTicketMutation = useRateTicket();

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    setRating(0);
    setFeedback("");
    setRatingError("");
    onClose();
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setRatingError(t("rating.selectRating"));
      return;
    }
    setRatingError("");
    const ticketId = ticket?._id || ticket?.id;
    try {
      await rateTicketMutation.mutateAsync({ ticketId, rating, feedback: feedback.trim() });
      toast.success(t("success.title"));
      handleClose();
    } catch (error) {
      toast.error(t("errors.submitFailed"));
    }
  };

  const renderStars = () =>
    [1, 2, 3, 4, 5].map((i) => (
      <TouchableOpacity
        key={i}
        onPress={() => {
          setRating(i);
          setRatingError("");
        }}
        style={styles.starButton}
        disabled={rateTicketMutation.isPending}
        activeOpacity={0.7}
      >
        <Ionicons
          name={i <= rating ? "star" : "star-outline"}
          size={40}
          color={i <= rating ? "#f39c12" : "#d0d0d0"}
        />
      </TouchableOpacity>
    ));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <Animated.View
          style={[styles.backdrop, { opacity: fadeAnim }]}
          onTouchEnd={handleClose}
        />

        <Animated.View
          style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t("title")}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={rateTicketMutation.isPending}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Ticket info */}
            {ticket && (
              <View style={styles.ticketInfo}>
                <Ionicons name="ticket-outline" size={20} color="#c28e5c" />
                <Text style={styles.ticketType} numberOfLines={1}>
                  {tTickets(`types.${ticket.type}`)}
                </Text>
              </View>
            )}

            {/* Star rating */}
            <View style={styles.section}>
              <Text style={styles.question}>{t("rating.question")}</Text>
              <View style={styles.starsContainer}>{renderStars()}</View>
              {rating > 0 && (
                <Text style={styles.ratingLabel}>
                  {t(`rating.${RATING_LABEL_KEYS[rating - 1]}`)}
                </Text>
              )}
              {!!ratingError && (
                <Text style={styles.errorText}>{ratingError}</Text>
              )}
            </View>

            {/* Feedback */}
            <View style={styles.section}>
              <Text style={styles.label}>{t("feedback.label")}</Text>
              <TextInput
                style={styles.textArea}
                value={feedback}
                onChangeText={setFeedback}
                placeholder={t("feedback.placeholder")}
                placeholderTextColor="#a0a0a0"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={1000}
                editable={!rateTicketMutation.isPending}
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={rateTicketMutation.isPending}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{t("buttons.cancel")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                rateTicketMutation.isPending && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={rateTicketMutation.isPending}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>
                {rateTicketMutation.isPending
                  ? t("buttons.submitting")
                  : t("buttons.submit")}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  ticketInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f5ece4",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 24,
  },
  ticketType: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  question: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 16,
    textAlign: "center",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#f39c12",
    textAlign: "center",
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    marginTop: 6,
    textAlign: "center",
  },
  label: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
    marginBottom: 10,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: "#2c2c2c",
    minHeight: 100,
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c28e5c",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#c28e5c",
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#c28e5c",
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#e0e0e0",
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#fff",
  },
});

export default TicketRatingModal;
