import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "../../localization";
import LocalizedText from "../commen/LocalizedText";

/**
 * Wizard footer. Source order + a plain logical `row` produce
 * Previous → Next in LTR and the mirrored visual order in RTL (blueprint
 * §4.1). Default labels come from translation keys — never literals.
 */
const PrevAndNextBtns = ({
  onNext,
  onPrevious,
  showPrevious = true,
  isNextDisabled = false,
  nextButtonText,
  previousButtonText,
  isLoading = false,
}) => {
  const { t } = useTranslation("createEvent");
  const resolvedNextLabel = nextButtonText ?? t("next_button");
  const resolvedPreviousLabel = previousButtonText ?? t("previous_button");
  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        {/* Previous Button */}
        {showPrevious && (
          <TouchableOpacity
            style={styles.prevButton}
            onPress={onPrevious}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <LocalizedText style={styles.prevButtonText}>
              {resolvedPreviousLabel}
            </LocalizedText>
          </TouchableOpacity>
        )}
        {/* Next Button */}
        <TouchableOpacity
          style={[
            styles.nextButton,
            isNextDisabled && styles.nextButtonDisabled,
          ]}
          onPress={onNext}
          disabled={isNextDisabled || isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color="#CEA57D" />
          ) : (
            <LocalizedText
              style={[
                styles.nextButtonText,
                isNextDisabled && styles.nextButtonTextDisabled,
              ]}
            >
              {resolvedNextLabel}
            </LocalizedText>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 8,
  },
  buttonContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nextButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#C28E5C",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  nextButtonDisabled: {
    backgroundColor: "#F5ECE4",
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
    lineHeight: 24,
    letterSpacing: 0.08,
  },
  nextButtonTextDisabled: {
    color: "#CEA57D",
  },
  prevButton: {
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6B392",
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  prevButtonText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
    lineHeight: 24,
    letterSpacing: 0.08,
  },
});

export default PrevAndNextBtns;

