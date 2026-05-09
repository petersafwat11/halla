import React from "react";
import { useFormContext } from "react-hook-form";
import GuestFormSection from "./_components/GuestFormSection";

const StepTwo = ({
  guestList = [],
  staffList = [],
  subscription = null,
}) => {
  const { watch } = useFormContext();
  const formData = watch();

  // Backend shape: { guestLimit, isGuestUnlimited, isPoolPlan, invitePool, invitesRemaining, ... }
  // Pool plans report `isGuestUnlimited: true` (no per-event cap) but the global
  // pool is still the effective constraint for THIS event — surface it so users
  // don't sail past their pool and get a 403 at submit. ∞ is reserved for the
  // platform-admin / unlimited plan bypass.
  const isPoolPlan = subscription?.isPoolPlan === true;
  const invitesRemaining = Number.isFinite(subscription?.invitesRemaining)
    ? subscription.invitesRemaining
    : null;
  const isUnlimited = subscription?.isGuestUnlimited === true && !isPoolPlan;
  const guestLimit = isPoolPlan
    ? (invitesRemaining ?? 0)
    : (subscription?.guestLimit ?? 0);
  const isLimitReached = !isUnlimited && guestList.length >= guestLimit;

  return (
    <GuestFormSection
      guestList={guestList}
      staffList={staffList}
      subscription={subscription}
      isLimitReached={isLimitReached}
      isUnlimited={isUnlimited}
      guestLimit={guestLimit}
    />
  );
};

export default StepTwo;
