import React from "react";
import PropTypes from "prop-types";
import ManagePlanModal from "./ManagePlanModal";

/**
 * Generic host "Manage Subscription" modal used from the hosts list. Thin
 * wrapper over the shared two-mode ManagePlanModal (change plan + extra
 * invites). Kept as a named component so existing list call sites
 * (`entity` + `onSave`) stay unchanged.
 */
const SubscriptionAssignmentModal = ({ visible, onClose, entity, onSave }) => (
  <ManagePlanModal
    visible={visible}
    onClose={onClose}
    entity={entity}
    entityType="host"
    onSave={onSave}
  />
);

SubscriptionAssignmentModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  entity: PropTypes.object,
  onSave: PropTypes.func,
};

export default SubscriptionAssignmentModal;
