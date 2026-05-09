"use client";
import { useMemo } from "react";
import StepOne from "../../create-event/_components/stepOne/StepOne";
import StepTwo from "../../create-event/_components/stepTwo/StepTwo";
import StepThree from "../../create-event/_components/stepThree/StepThree";
import StepFour from "../../create-event/_components/stepFour/StepFour";

/**
 * Builds the per-step configuration (title, description, component, props)
 * for the update-event wizard.
 *
 * Extracted from UpdateEventWizard to keep the parent component
 * under the 250-line limit (Rule 1 / Rule 9).
 */
const useStepConfig = ({ t, subscriptionInfo, eventRaw, isEventLive }) =>
  useMemo(
    () => ({
      1: {
        title: t("step1_title"),
        description: t("step1_description"),
        Component: StepOne,
      },
      2: {
        title: t("step2_title"),
        description: t("step2_description"),
        Component: StepTwo,
        props: {
          subscription: {
            // For live events, use the event's frozen guestLimit; otherwise use subscription
            guestLimit: eventRaw?.guestLimit ?? subscriptionInfo?.guestLimit ?? 0,
            isGuestUnlimited:
              eventRaw?.guestLimit === -1 ||
              subscriptionInfo?.isGuestUnlimited === true ||
              false,
            // Pool-plan effective cap is the *current* invitesRemaining on the
            // subscription. Forwarded so StepTwo can show the real ceiling
            // instead of ∞ when editing a pool-plan event.
            isPoolPlan: subscriptionInfo?.isPoolPlan === true,
            invitePool: subscriptionInfo?.invitePool ?? null,
            invitesRemaining: subscriptionInfo?.invitesRemaining ?? null,
          },
          allowAddOnly: isEventLive,
        },
      },
      3: {
        title: t("step3_title"),
        description: t("step3_description"),
        Component: StepThree,
      },
      4: {
        title: t("step4_title"),
        description: t("step4_description"),
        Component: StepFour,
      },
    }),
    [subscriptionInfo, t, eventRaw, isEventLive]
  );

export default useStepConfig;
