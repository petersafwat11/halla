"use client";

import ManagePlanPopup from "../../../_components/ManagePlanPopup";

export default function AssignPlanPopup({ businessId, business, onClose }) {
  return (
    <ManagePlanPopup
      entity={business}
      entityId={businessId}
      entityType="business"
      onClose={onClose}
    />
  );
}
