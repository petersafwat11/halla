/**
 * Phase 4d W1-MOBILE-UPDATE — Update wizard Step 2 (guest list + staff).
 *
 * Wraps the create-event StepTwo and surfaces the D10 live-event
 * "allow-add-only" branch so step 2 stays interactive on a live event
 * while every other step locks. Existing rows are visually marked
 * read-only via the `allowAddOnly` flag, which the create-event StepTwo
 * already accepts in its prop signature.
 *
 * Save dispatch: the parent screen calls `useUpdateEventStep2` so guest
 * list + staff list update atomically through the new
 * `PATCH /events/:id/step2` endpoint.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import CreateStepTwo from "../../components/createEvent/StepTwo";

const StepTwo = ({ guestList, staffList, subscription, allowAddOnly = false }) => (
  <View style={styles.container}>
    {allowAddOnly && (
      <View style={styles.banner} accessibilityRole="alert">
        <Text style={styles.bannerText}>
          المناسبة قيد التشغيل: يمكنك إضافة ضيوف فقط — تعديل أو حذف الضيوف
          الحاليين معطل.
        </Text>
      </View>
    )}
    <CreateStepTwo
      guestList={guestList}
      staffList={staffList}
      subscription={subscription}
      allowAddOnly={allowAddOnly}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    margin: 0,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FFF7E6",
    borderWidth: 1,
    borderColor: "#FFD591",
  },
  bannerText: {
    fontSize: 13,
    color: "#7A4F01",
    fontFamily: "Cairo_500Medium",
    textAlign: "right",
  },
});

export default StepTwo;
