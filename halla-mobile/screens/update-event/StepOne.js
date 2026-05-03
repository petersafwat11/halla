/**
 * Phase 4d W1-MOBILE-UPDATE — Update wizard Step 1 (event details).
 *
 * Thin wrapper around the create-event StepOne. Kept as its own file so
 * the update-wizard route tree mirrors the web (D2: single update-event
 * page used by all roles) and so any update-mode-only behaviour (e.g.
 * disabled-on-live) lands in one place without changing create-event
 * components.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import CreateStepOne from "../../components/createEvent/StepOne";

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
