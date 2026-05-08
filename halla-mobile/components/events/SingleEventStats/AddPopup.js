import React from "react";
import AddGuestOrModeratorPopup from "../AddGuestOrmoderatorPopup";

/**
 * Thin wrapper around the shared add-guest/add-moderator popup so the
 * top-level orchestration component does not have to know the
 * underlying file name (which has a lowercase 'm' typo preserved on
 * disk).
 */
const AddPopup = ({
  visible,
  onClose,
  onSave,
  activeTab,
  initialData,
  loading,
}) => (
  <AddGuestOrModeratorPopup
    visible={visible}
    onClose={onClose}
    onSave={onSave}
    type={activeTab === "guests" ? "guest" : "moderator"}
    initialData={initialData}
    loading={loading}
  />
);

export default AddPopup;
