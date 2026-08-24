import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LocalizedText from "./LocalizedText";

/**
 * Vendor-signup progress stepper.
 *
 * The horizontal row follows the inherited logical layout direction (no
 * row-reverse), so steps read start→end in both locales. Step labels are app
 * copy rendered through the localized text-role contract; step-number glyphs
 * stay pinned LTR so multi-digit indexes cannot split under RTL (blueprint
 * §4.1 StepHeader pattern).
 */
const SignupStepper = ({ steps, currentStep }) => {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;

          return (
            <View key={step.id} style={styles.stepWrapper}>
              {/* Connector Line (before each step except first) */}
              {index > 0 && (
                <View
                  style={[
                    styles.connector,
                    (isCompleted || isActive) && styles.connectorActive,
                  ]}
                />
              )}

              {/* Step Circle + Label */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.circle,
                    isActive && styles.circleActive,
                    isCompleted && styles.circleCompleted,
                  ]}
                >
                  {isCompleted ? (
                    /* Check is a semantic glyph — never mirrored. */
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  ) : (
                    <LocalizedText
                      style={[
                        styles.circleText,
                        (isActive || isCompleted) && styles.circleTextActive,
                      ]}
                    >
                      {stepNum}
                    </LocalizedText>
                  )}
                </View>
                <LocalizedText
                  center
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isCompleted && styles.stepLabelCompleted,
                  ]}
                  numberOfLines={2}
                >
                  {step.desc}
                </LocalizedText>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
  },
  stepWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  connector: {
    width: 28,
    height: 2,
    backgroundColor: "#e0e0e0",
    marginTop: -18,
  },
  connectorActive: {
    backgroundColor: "#C28E5C",
  },
  stepItem: {
    alignItems: "center",
    width: 64,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  circleActive: {
    backgroundColor: "#C28E5C",
    borderColor: "#C28E5C",
    shadowColor: "#C28E5C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  circleCompleted: {
    backgroundColor: "#8B6840",
    borderColor: "#8B6840",
  },
  circleText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#999",
    writingDirection: "ltr",
  },
  circleTextActive: {
    color: "#fff",
  },
  stepLabel: {
    fontSize: 10,
    fontFamily: "Cairo_400Regular",
    color: "#aaa",
    lineHeight: 14,
  },
  stepLabelActive: {
    fontFamily: "Cairo_600SemiBold",
    color: "#C28E5C",
  },
  stepLabelCompleted: {
    color: "#8B6840",
  },
});

export default SignupStepper;
