import React from "react";
import { View } from "react-native";
import EventActionDropdown, { EventActionItem } from "../../events/EventActionDropdown";
import EventActionsSection from "./EventActionsSection";

export default function AdminEventActionsMenu({ onManageStaff, children, ...props }) {
  const { t, updatePending, deletePending, onStatusChange, onDelete } = props;
  const busy = updatePending || deletePending;
  return <EventActionDropdown label={t("eventDetails.moreActions")} icon="ellipsis-horizontal" disabled={busy} resetKey={props.event?.id || props.event?._id}>
    {(close) => <>
      {children?.(close)}
      {!!onManageStaff && <EventActionItem label={t("eventDetails.manageStaff")} icon="people-outline" onPress={() => { close(); onManageStaff(); }} />}
      <EventActionsSection {...props} updatePending={busy} deletePending={busy}
        onStatusChange={(...args) => { close(); onStatusChange(...args); }}
        onDelete={() => { close(); onDelete(); }}
        SectionCard={({ children: content }) => <View>{content}</View>} />
    </>}
  </EventActionDropdown>;
}
