import React from "react";

import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import StepThree from "./StepThree";
import StepFour from "./StepFour";

/**
 * Switches over `currentStep` to render the matching wizard step. The
 * screen owns navigation, form state and mutations; this renderer just
 * wires the shared props (lockout flags, guest/staff lists, subscription
 * limits) into the step component for the current step.
 */
const UpdateEventStepRenderer = ({
  currentStep,
  formData,
  eventData,
  subscription,
  lockoutActive,
  allowAddOnlyOnStep2,
}) => {
  switch (currentStep) {
    case 1:
      return <StepOne disabled={lockoutActive} />;
    case 2: {
      // Pool-plan events are saved with `guestLimit: -1` (no per-event
      // cap; the cap is the global invitePool). Inferring "unlimited"
      // from `eventData.guestLimit === -1` is wrong for pool plans and
      // also wrong if the host changed plans between create and edit.
      // Trust subscription-info as the single source of truth.
      const isPool = subscription?.isPoolPlan === true;
      const subUnlimited = subscription?.isGuestUnlimited === true;
      const eventFrozenLimit =
        !isPool &&
        Number.isInteger(eventData?.guestLimit) &&
        eventData.guestLimit > 0
          ? eventData.guestLimit
          : null;

      return (
        <StepTwo
          guestList={formData.guestList}
          staffList={formData.staffList}
          allowAddOnly={allowAddOnlyOnStep2}
          subscription={{
            guestLimit: isPool
              ? (subscription?.invitesRemaining ?? 0)
              : (eventFrozenLimit ??
                  subscription?.guestLimit ??
                  subscription?.guests?.limitPerEvent ??
                  subscription?.limits?.maxInvitesPerEvent ??
                  0),
            isGuestUnlimited: subUnlimited && !isPool,
            isPoolPlan: isPool,
            invitePool: subscription?.invitePool ?? null,
            invitesRemaining: subscription?.invitesRemaining ?? null,
          }}
        />
      );
    }
    case 3:
      return <StepThree disabled={lockoutActive} />;
    case 4:
      return <StepFour disabled={lockoutActive} />;
    default:
      return null;
  }
};

export default UpdateEventStepRenderer;
