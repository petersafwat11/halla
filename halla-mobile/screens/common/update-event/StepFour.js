/**
 * Update wizard Step 4 (Taqnyat picker). Reuses the create-event
 * StepFour, which filters Taqnyat templates by the visual template's
 * category and dual-writes `selectedTemplate` and
 * `taqnyatTemplate.templateRef`.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import CreateStepFour from "../../../components/createEvent/StepFour";

const StepFour = ({ disabled = false }) => (
  <View
    style={[styles.container, disabled && styles.disabled]}
    pointerEvents={disabled ? "none" : "auto"}
  >
    <CreateStepFour />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  disabled: { opacity: 0.6 },
});

export default StepFour;
