/**
 * Update wizard Step 5 (messaging + replies + note). Reuses the
 * create-event StepFive; canonical writes (`invitationMessage`,
 * `guestReplies.*`, `hostNote`) happen via form-context `setValue`
 * calls inside the create component, and the parent screen calls
 * `useUpdateMessagingContent` on save.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import CreateStepFive from "../../../components/createEvent/StepFive";

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
