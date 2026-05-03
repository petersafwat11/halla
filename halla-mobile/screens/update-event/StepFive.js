/**
 * Phase 4d W1-MOBILE-UPDATE — Update wizard Step 5 (messaging + replies + note).
 *
 * Reuses the create-event StepFive (Phase 4c W2-MOBILE-WIZARD). All
 * canonical writes (`invitationMessage`, `guestReplies.*`, `hostNote`)
 * happen via the form-context `setValue` calls inside the create
 * component; the parent screen calls `useUpdateMessagingContent` on
 * save.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import CreateStepFive from "../../components/createEvent/StepFive";

const StepFive = ({ disabled = false }) => (
  <View
    style={[styles.container, disabled && styles.disabled]}
    pointerEvents={disabled ? "none" : "auto"}
  >
    <CreateStepFive />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  disabled: { opacity: 0.6 },
});

export default StepFive;
