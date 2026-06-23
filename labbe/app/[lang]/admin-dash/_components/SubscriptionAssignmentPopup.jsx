"use client";

import ManagePlanPopup from "./ManagePlanPopup";

export default function SubscriptionAssignmentPopup({ entity, entityId, onClose }) {
  return (
    <ManagePlanPopup
      entity={entity}
      entityId={entityId}
      entityType="host"
      onClose={onClose}
    />
  );
}
