/**
 * Update wizard Step 1 (event details). Thin wrapper around the
 * create-event StepOne; kept as its own file so update-mode-only
 * behaviour (e.g. disabled-on-live) can land here without touching the
 * create-event component.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import CreateStepOne from "../../../components/createEvent/StepOne";

const StepOne = ({ disabled = false }) => (
  <View style={[styles.container, disabled && styles.disabled]} pointerEvents={disabled ? "none" : "auto"}>
    <CreateStepOne />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  disabled: { opacity: 0.6 },
});

export default StepOne;
