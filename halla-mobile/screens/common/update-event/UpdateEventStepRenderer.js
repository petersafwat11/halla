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
    case 2:
      return (
        <StepTwo
          guestList={formData.guestList}
          staffList={formData.staffList}
          allowAddOnly={allowAddOnlyOnStep2}
          subscription={{
            guestLimit:
              eventData?.guestLimit ??
              subscription?.guestLimit ??
              subscription?.guests?.limitPerEvent ??
              subscription?.limits?.invitePool ??
              subscription?.limits?.maxInvitesPerEvent ??
              0,
            isGuestUnlimited:
              eventData?.guestLimit === -1 ||
              subscription?.isGuestUnlimited === true ||
              false,
            // Pool-plan effective cap is the *current* invitesRemaining on the
            // subscription. Forwarded so StepTwo shows the real ceiling instead
            // of ∞ when editing a pool-plan event.
            isPoolPlan: subscription?.isPoolPlan === true,
            invitePool: subscription?.invitePool ?? null,
            invitesRemaining: subscription?.invitesRemaining ?? null,
          }}
        />
      );
    case 3:
      return <StepThree disabled={lockoutActive} />;
    case 4:
      return <StepFour disabled={lockoutActive} />;
    default:
      return null;
  }
};

export default UpdateEventStepRenderer;
