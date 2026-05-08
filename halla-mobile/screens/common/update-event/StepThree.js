/**
 * Update wizard Step 3 (visual template). Reuses the create-event
 * StepThree, which already emits canonical `visualTemplate.data` keyed
 * by `field.key`. Lockout is applied at the wrapper level via
 * `pointerEvents` so live events cannot edit the visual template.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import CreateStepThree from "../../../components/createEvent/StepThree";

const StepThree = ({ disabled = false }) => (
  <View
    style={[styles.container, disabled && styles.disabled]}
    pointerEvents={disabled ? "none" : "auto"}
  >
    <CreateStepThree />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  disabled: { opacity: 0.6 },
});

export default StepThree;
