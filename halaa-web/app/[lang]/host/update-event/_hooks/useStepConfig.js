"use client";
import { useMemo } from "react";
import StepOne from "../../create-event/_components/stepOne/StepOne";
import StepTwo from "../../create-event/_components/stepTwo/StepTwo";
import StepThree from "../../create-event/_components/stepThree/StepThree";
import StepFour from "../../create-event/_components/stepFour/StepFour";

/**
 * Builds the per-step configuration (title, description, component, props)
 * for the update-event wizard.
 */
const useStepConfig = ({ t, subscriptionInfo, eventRaw, isEventLive }) =>
  useMemo(
    () => {
      // Pool-plan events are saved with `guestLimit: -1` (no per-event
      // cap; the cap is the global invitePool). Inferring "unlimited"
      // from `eventRaw.guestLimit === -1` is wrong for pool plans and
      // also wrong if the host changed plans between create and edit.
      // Trust subscription-info as the single source of truth.
      const isPool = subscriptionInfo?.isPoolPlan === true;
      const subUnlimited = subscriptionInfo?.isGuestUnlimited === true;
      // Frozen per-event cap only applies to non-pool plans where the
      // event was created with a positive numeric ceiling.
      const eventFrozenLimit =
        !isPool &&
        Number.isInteger(eventRaw?.guestLimit) &&
        eventRaw.guestLimit > 0
          ? eventRaw.guestLimit
          : null;

      return {
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
            planCode: subscriptionInfo?.planCode ?? null,
            status: subscriptionInfo?.status ?? null,
            guestLimit: isPool
              ? (subscriptionInfo?.invitesRemaining ?? 0)
              : (eventFrozenLimit ?? subscriptionInfo?.guestLimit ?? 0),
            isGuestUnlimited: subUnlimited && !isPool,
            isPoolPlan: isPool,
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
    };
    },
    [subscriptionInfo, t, eventRaw, isEventLive]
  );

export default useStepConfig;
