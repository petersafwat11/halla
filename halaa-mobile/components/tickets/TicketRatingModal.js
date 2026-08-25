import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import DirectionalTextInput from "../commen/DirectionalTextInput";
import LocalizedText from "../commen/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import KeyboardSafeModalSheet from "../commen/keyboard/KeyboardSafeModalSheet";
import { useRateTicket } from "../../hooks";
import { useToast } from "../../contexts/ToastContext";
import { CONTENT_DIRECTIONS } from "../../hooks/useInputDirection";

const RATING_LABEL_KEYS = ["veryPoor", "poor", "average", "good", "excellent"];

const TicketRatingModal = ({ visible, onClose, ticket }) => {
  const { t } = useTranslation("ticketRating");
  const { t: tTickets } = useTranslation("tickets");
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [ratingError, setRatingError] = useState("");

  const rateTicketMutation = useRateTicket();

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
        accessibilityRole="button"
        accessibilityLabel={t(`rating.${RATING_LABEL_KEYS[i - 1]}`)}
      >
        <Ionicons
          name={i <= rating ? "star" : "star-outline"}
          size={40}
          color={i <= rating ? "#f39c12" : "#d0d0d0"}
        />
      </TouchableOpacity>
    ));

  const header = (
    <View style={styles.header}>
      <LocalizedText style={styles.title}>
        {t("title")}
      </LocalizedText>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleClose}
        disabled={rateTicketMutation.isPending}
        activeOpacity={0.7}
        accessibilityLabel={t("buttons.cancel")}
      >
        <Ionicons name="close" size={24} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const footer = (
    <View style={styles.actions}>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleClose}
        disabled={rateTicketMutation.isPending}
        activeOpacity={0.7}
      >
        <LocalizedText style={styles.cancelButtonText} center>
          {t("buttons.cancel")}
        </LocalizedText>
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
        <LocalizedText style={styles.submitButtonText} center>
          {rateTicketMutation.isPending
            ? t("buttons.submitting")
            : t("buttons.submit")}
        </LocalizedText>
      </TouchableOpacity>
    </View>
  );

  return (
    // Shared sheet (§8.2 tickets row): aware scroll body keeps the growing
    // feedback field visible; actions stay attached above the keyboard.
    <KeyboardSafeModalSheet
      visible={visible}
      onClose={handleClose}
      onRequestClose={handleClose}
      header={header}
      footer={footer}
      maxHeightRatio={0.85}
      contentContainerStyle={styles.body}
      accessibilityLabel={t("title")}
    >
      {/* Ticket info */}
      {ticket && (
        <View style={styles.ticketInfo}>
          <Ionicons name="ticket-outline" size={20} color="#c28e5c" />
          <LocalizedText style={styles.ticketType} numberOfLines={1}>
            {tTickets(`types.${ticket.type}`)}
          </LocalizedText>
        </View>
      )}

      {/* Star rating */}
      <View style={styles.section}>
        <LocalizedText style={styles.question} center>
          {t("rating.question")}
        </LocalizedText>
        {/* Star order is intentionally physical: a 1→5 rating scale is
            numeric geometry, not navigation, so it must not mirror with
            the locale (blueprint §7). Pinned LTR in both languages. */}
        <View style={[styles.starsContainer, styles.starsDirection]}>{renderStars()}</View>
        {rating > 0 && (
          <LocalizedText style={styles.ratingLabel} center>
            {t(`rating.${RATING_LABEL_KEYS[rating - 1]}`)}
          </LocalizedText>
        )}
        {!!ratingError && (
          <LocalizedText style={styles.errorText} center>
            {ratingError}
          </LocalizedText>
        )}
      </View>

      {/* Feedback */}
      <View style={styles.section}>
        <LocalizedText style={styles.label}>
          {t("feedback.label")}
        </LocalizedText>
        <DirectionalTextInput
          style={styles.textArea}
          contentDirection={CONTENT_DIRECTIONS.ADAPTIVE}
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
    </KeyboardSafeModalSheet>
  );
};

const styles = StyleSheet.create({
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
  // Intentional physical geometry (blueprint §7): the 1→5 rating scale reads
  // left-to-right in every locale, so the row is pinned LTR and must not
  // mirror under the app's forced RTL.
  starsDirection: {
    direction: "ltr",
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
