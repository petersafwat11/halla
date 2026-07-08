import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import ActionButton from "../common/ActionButton";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

const RatingModal = ({ visible, onClose, vendor, onSave, loading }) => {
  const { t } = useTranslation("admin");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [ratingError, setRatingError] = useState("");

  const displayName =
    vendor?.brandName ||
    vendor?.vendorData?.brandName ||
    vendor?.username ||
    "—";
  const ownerName = vendor?.name || vendor?.username || "";

  const handleSave = () => {
    if (rating === 0) {
      setRatingError(t("vendors.rating.selectRating"));
      return;
    }
    setRatingError("");
    onSave({ rating, comment: comment.trim() });
  };

  const handleClose = () => {
    setRating(0);
    setComment("");
    setRatingError("");
    onClose();
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => {
            setRating(i);
            setRatingError("");
          }}
          style={styles.starButton}
          disabled={loading}
        >
          <Ionicons
            name={i <= rating ? "star" : "star-outline"}
            size={40}
            color={i <= rating ? colors.warning[500] : colors.natural[300]}
          />
        </TouchableOpacity>,
      );
    }
    return stars;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("vendors.rating.title")}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} disabled={loading}>
              <Ionicons name="close" size={24} color={colors.natural[900]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.vendorInfo}>
              <Text style={styles.vendorName}>{displayName}</Text>
              {!!ownerName && <Text style={styles.vendorOwner}>{ownerName}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("vendors.rating.newRating")}</Text>
              <View style={styles.starsContainer}>{renderStars()}</View>
              {rating > 0 && (
                <Text style={styles.ratingText}>
                  {rating} {rating === 1 ? "★" : "★★"}
                </Text>
              )}
              {!!ratingError && (
                <Text style={styles.errorText}>{ratingError}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t("vendors.rating.review")}</Text>
              <TextInput
                style={styles.textArea}
                value={comment}
                onChangeText={setComment}
                placeholder={t("vendors.rating.reviewPlaceholder")}
                placeholderTextColor={colors.natural[400]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <ActionButton
              title={t("vendors.rating.cancel")}
              onPress={handleClose}
              variant="outline"
              style={styles.button}
              disabled={loading}
            />
            <ActionButton
              title={t("vendors.rating.save")}
              onPress={handleSave}
              variant="primary"
              style={styles.button}
              loading={loading}
              disabled={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: backgrounds.card[1],
    borderTopLeftRadius: borderRadius[20],
    borderTopRightRadius: borderRadius[20],
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[20],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  title: {
    ...textStyles.titleLarge,
    color: colors.natural[900],
  },
  closeButton: {
    padding: spacing[4],
  },
  content: {
    padding: spacing[20],
  },
  vendorInfo: {
    marginBottom: spacing[24],
    padding: spacing[16],
    backgroundColor: backgrounds.card[3],
    borderRadius: borderRadius[12],
  },
  vendorName: {
    ...textStyles.titleMedium,
    color: colors.natural[900],
    marginBottom: spacing[4],
  },
  vendorOwner: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[450],
  },
  field: {
    marginBottom: spacing[20],
  },
  label: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[900],
    marginBottom: spacing[12],
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing[8],
    paddingVertical: spacing[12],
  },
  starButton: {
    padding: spacing[4],
  },
  ratingText: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[900],
    textAlign: "center",
    marginTop: spacing[8],
    fontWeight: typography.fontWeight.medium,
  },
  textArea: {
    backgroundColor: backgrounds.card[2],
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.natural[250],
    padding: spacing[12],
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[900],
    minHeight: 100,
  },
  errorText: {
    fontSize: typography.fontSize.body.small,
    color: colors.error[500],
    marginTop: spacing[4],
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    padding: spacing[20],
    gap: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colors.natural[200],
  },
  button: {
    flex: 1,
  },
});

export default RatingModal;
