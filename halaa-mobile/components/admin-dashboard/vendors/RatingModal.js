import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import KeyboardSafeModalSheet from "../../commen/keyboard/KeyboardSafeModalSheet";
import TextInput from "../../commen/DirectionalTextInput";
import LocalizedText from "../../commen/LocalizedText";
import AdaptiveText from "../../commen/AdaptiveText";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import ActionButton from "../common/ActionButton";
import { CONTENT_DIRECTIONS } from "../../../hooks/useInputDirection";
import { formatCount } from "@halaa/shared/utils/locale";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

const RatingModal = ({ visible, onClose, vendor, onSave, loading }) => {
  const { t, currentLanguage } = useTranslation("admin");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [ratingError, setRatingError] = useState("");

  const displayName =
    vendor?.brandName ||
    vendor?.vendorData?.brandName ||
        "—";
  const ownerName = vendor?.name || "";

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
          accessibilityRole="button"
          accessibilityLabel={t("vendors.rating.summary", {
            rating: formatCount(i, currentLanguage),
          })}
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

  const header = (
    <View style={styles.header}>
      <LocalizedText role="sectionTitle" style={styles.title}>
        {t("vendors.rating.title")}
      </LocalizedText>
      <TouchableOpacity
        onPress={handleClose}
        style={styles.closeButton}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={t("vendors.rating.cancel")}
      >
        {/* Close is semantic — never mirrored. */}
        <Ionicons name="close" size={24} color={colors.natural[900]} />
      </TouchableOpacity>
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <View style={styles.buttonWrapper}>
        <ActionButton
          label={t("vendors.rating.cancel")}
          onPress={handleClose}
          variant="secondary"
          disabled={loading}
        />
      </View>
      <View style={styles.buttonWrapper}>
        <ActionButton
          label={t("vendors.rating.save")}
          onPress={handleSave}
          variant="primary"
          loading={loading}
          disabled={loading}
        />
      </View>
    </View>
  );

  return (
    // Shared sheet (§8.2 admin row): aware scroll body keeps the growing
    // review field visible; actions stay attached above the keyboard.
    <KeyboardSafeModalSheet
      visible={visible}
      onClose={handleClose}
      onRequestClose={handleClose}
      header={header}
      footer={footer}
      contentContainerStyle={styles.contentPadding}
      sheetStyle={styles.sheetBg}
    >
      <View style={styles.vendorInfo}>
        {/* Store/brand and owner are backend content — first-strong. */}
        <AdaptiveText style={styles.vendorName}>
          {displayName}
        </AdaptiveText>
        {!!ownerName && (
          <AdaptiveText style={styles.vendorOwner}>
            {ownerName}
          </AdaptiveText>
        )}
      </View>

      <View style={styles.field}>
        <LocalizedText role="label" style={styles.label}>
          {t("vendors.rating.newRating")}
        </LocalizedText>
        {/* A 1→5 numeric scale is intentionally physical: pinned LTR
            so the star order never mirrors by accident (blueprint §7). */}
        <View style={styles.starsContainer}>{renderStars()}</View>
        {rating > 0 && (
          <LocalizedText role="body" center style={styles.ratingText}>
            {t("vendors.rating.summary", {
              rating: formatCount(rating, currentLanguage),
            })}
          </LocalizedText>
        )}
        {!!ratingError && (
          <LocalizedText role="error" center style={styles.errorText}>
            {ratingError}
          </LocalizedText>
        )}
      </View>

      <View style={styles.field}>
        <LocalizedText role="label" style={styles.label}>
          {t("vendors.rating.review")}
        </LocalizedText>
        {/* Free-text review is arbitrary user content (blueprint §5.3):
            localized placeholder while empty, first-strong when filled.
            The label above stays localized either way. */}
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
          contentDirection={CONTENT_DIRECTIONS.ADAPTIVE}
        />
      </View>
    </KeyboardSafeModalSheet>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheetBg: {
    backgroundColor: backgrounds.card[1],
  },
  contentPadding: {
    padding: spacing[20],
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
    width: 44,
    height: 44,
    borderRadius: borderRadius[8],
    alignItems: "center",
    justifyContent: "center",
    marginEnd: -spacing[8],
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
    // Physical LTR: the 1→5 rating scale must not mirror in Arabic.
    direction: "ltr",
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
  buttonWrapper: {
    flex: 1,
  },
});

export default RatingModal;
