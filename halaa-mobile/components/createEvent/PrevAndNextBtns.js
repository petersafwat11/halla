import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
const PrevAndNextBtns = ({
  onNext,
  onPrevious,
  showPrevious = true,
  isNextDisabled = false,
  nextButtonText = "التالى",
  previousButtonText = "السابق",
  isLoading = false,
}) => {
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
            <Text style={styles.prevButtonText}>{previousButtonText}</Text>
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
            <Text
              style={[
                styles.nextButtonText,
                isNextDisabled && styles.nextButtonTextDisabled,
              ]}
            >
              {nextButtonText}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "#FFF",
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
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
