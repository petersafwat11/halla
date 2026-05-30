import React from "react";
import { View, StyleSheet } from "react-native";
import useEventActionGate from "@halla/shared/hooks/useEventActionGate";
import LastEventHeader from "./_components/LastEventHeader";
import LastEventStatsRow from "./_components/LastEventStatsRow";
import LastEventQuota from "./_components/LastEventQuota";
import LastEventActions from "./_components/LastEventActions";

const LastEvent = ({
  event,
  onEditPress,
  onTestMessagePress,
  onViewStatsPress,
  onSchedulePress,
  onNotifyStaffPress,
  onPostEventPress,
  subscription,
  isNotifyingStaff,
}) => {
  if (!event) return null;

  const testMessageSent = event.testMessageSent || false;
  const {
    canSendTest,
    canSchedule,
    isCompleted,
    hasStaff: hasSupervisors,
  } = useEventActionGate({ event, testMessageSent });

  return (
    <View style={styles.container}>
      <LastEventHeader event={event} />

      <LastEventStatsRow stats={event.stats} />

      {subscription && <LastEventQuota quota={event.quota} />}

      <LastEventActions
        canSendTest={canSendTest}
        canSchedule={canSchedule}
        hasSupervisors={hasSupervisors}
        isCompleted={isCompleted}
        isNotifyingStaff={isNotifyingStaff}
        onTestMessagePress={onTestMessagePress}
        onSchedulePress={onSchedulePress}
        onNotifyStaffPress={onNotifyStaffPress}
        onViewStatsPress={onViewStatsPress}
        onPostEventPress={onPostEventPress}
        onEditPress={onEditPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderTopWidth: 1,
    borderRightWidth: 6,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#C28E5C",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default LastEvent;
