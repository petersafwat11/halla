/**
 * Phase 4d W1-MOBILE-UPDATE — Update wizard Step 3 (visual template).
 *
 * Reuses the create-event StepThree (Phase 4c W1-VISUAL + W2-MOBILE-WIZARD).
 * That component already emits canonical `visualTemplate.data` from
 * `field.key` (verified by W1-MOBILE-CREATE-VERIFY), so update-mode
 * can re-use it without per-step adapter logic. The lockout state is
 * applied at the outer wrapper level via `pointerEvents` so live events
 * cannot edit the visual template.
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
