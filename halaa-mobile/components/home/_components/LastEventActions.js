import EventActionDropdown, { EventActionItem } from "../../events/EventActionDropdown";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing } from "../../../styles/tokens";
import { useTranslation } from "../../../localization";

const DROPDOWN_STEPS = [
  { step: 1, key: "lastEvent.dropdown.eventDetails" },
  { step: 2, key: "lastEvent.dropdown.guestList" },
  { step: 3, key: "lastEvent.dropdown.invitationDesign" },
  { step: 4, key: "lastEvent.dropdown.invitationCustomization" },
];


export default function LastEventActions({
  event,
  canSendTest,
  canSchedule,
  isCompleted,
  onTestMessagePress,
  onSchedulePress,
  onViewStatsPress,
  onPostEventPress,
  onEditPress,
}) {
  const { t } = useTranslation("home");
  const handleEditStep = (step) => {
    if (onEditPress) onEditPress(step);
  };

  return (
    <>
      <View style={styles.actionButtonsRow}>
        {canSendTest && onTestMessagePress && (
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={onTestMessagePress}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineButtonText}>{t("lastEvent.buttons.testMessage")}</Text>
          </TouchableOpacity>
        )}
        {canSchedule && onSchedulePress && (
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={onSchedulePress}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineButtonText}>{t("lastEvent.buttons.scheduleEvent")}</Text>
          </TouchableOpacity>
        )}
        {/* Notify Staff intentionally omitted here to match the web
            dashboard card (labbe LastEventActions). Notify Staff lives on
            the single-event page (EventActionsHeader) on both platforms. */}
        {onViewStatsPress && (
          <TouchableOpacity style={styles.outlineButton} onPress={onViewStatsPress} activeOpacity={0.7}>
            <Text style={styles.outlineButtonText}>{t("lastEvent.buttons.viewStats")}</Text>
          </TouchableOpacity>
        )}
        {isCompleted && onPostEventPress && (
          <TouchableOpacity style={styles.outlineButton} onPress={onPostEventPress} activeOpacity={0.7}>
            <Text style={styles.outlineButtonText}>{t("lastEvent.buttons.sharePostEvent")}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isCompleted && <EventActionDropdown primary label={t("lastEvent.buttons.editEvent")} icon="create-outline">
        {(close) => DROPDOWN_STEPS.filter(item => !event || (event.capabilities?.[{ 1: 'canEditDetails', 2: 'canAddGuest', 3: 'canEditDesign', 4: 'canEditMessages' }[item.step]] ?? ['pending_review', 'pending_scheduling', 'scheduled'].includes(event.status))).map(item => <EventActionItem key={item.step} label={t(item.key)} icon="create-outline" onPress={() => { close(); handleEditStep(item.step); }} />)}
      </EventActionDropdown>}

    </>
  );
}

const styles = StyleSheet.create({
  actionButtonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8], width: '100%' },
  outlineButton: { flexGrow: 1, flexBasis: 150, minHeight: 48, padding: spacing[12], justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.primary[200], backgroundColor: colors.natural[50] },
  outlineButtonText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: colors.primary[800], textAlign: 'center' },
});
