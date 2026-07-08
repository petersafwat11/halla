import React from "react";
import PropTypes from "prop-types";
import ManagePlanModal from "../common/ManagePlanModal";

/**
 * Host "Manage Subscription" entry point. Thin wrapper over the shared
 * two-mode ManagePlanModal (change plan + extra invites) so host and
 * business admin flows share one implementation.
 */
const SubscriptionModal = ({ visible, onClose, host }) => (
  <ManagePlanModal
    visible={visible}
    onClose={onClose}
    entity={host}
    entityType="host"
  />
);

SubscriptionModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  host: PropTypes.object,
};

export default SubscriptionModal;
