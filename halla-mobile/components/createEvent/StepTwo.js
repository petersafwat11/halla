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

  // Backend /subscription-info shape: { guestLimit, isGuestUnlimited, invitePool, invitesRemaining, ... }
  const guestLimit = subscription?.guestLimit ?? 0;
  const isUnlimited = subscription?.isGuestUnlimited === true;
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
