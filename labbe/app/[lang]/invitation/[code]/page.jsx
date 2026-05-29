"use client";
import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  useGuestByToken,
  useGuestMutation,
} from "@/hooks/guests";
import { useLocalizedDate } from "@/utils/date/useLocalizedDate";
import styles from "./page.module.css";
import PortalSkeleton from "./_components/PortalSkeleton";
import PortalRsvpForm from "./_components/PortalRsvpForm";
import PortalConfirmed from "./_components/PortalConfirmed";
import PortalThankYou from "./_components/PortalThankYou";

const DEFAULT_PRIMARY = "#2a8c5b";
const DEFAULT_BG = "#faf7f1";

function pickErrorCopy(error, t) {
  const status = error?.response?.status ?? error?.status;
  if (status === 404)
    return t(
      "guestPortal.errors.notFound",
      "Invitation not found. Please check your link."
    );
  if (status === 403)
    return t(
      "guestPortal.errors.forbidden",
      "This invitation link is no longer valid."
    );
  if (status === 400)
    return t(
      "guestPortal.errors.notAcceptingRsvps",
      "This event is no longer accepting RSVPs."
    );
  if (status === 0 || error?.code === "ERR_NETWORK")
    return t(
      "guestPortal.errors.network",
      "Network error. Please check your connection and try again."
    );
  return t("guestPortal.errors.unknown", "Something went wrong. Please try again.");
}

function isReplaySuccess(error) {
  const status = error?.response?.status ?? error?.status;
  return status === 409 || status === 410;
}

export default function GuestPortalPage() {
  const { code } = useParams();
  const { t } = useTranslation("guest-portal");
  const { formatDate } = useLocalizedDate();

  const { data, isLoading, error: loadError } = useGuestByToken(code);
  const rsvpMutation = useGuestMutation("rsvp");

  const [submittedResponse, setSubmittedResponse] = useState(null);

  const guest = data?.data?.guest || data?.guest || null;
  const event = data?.data?.event || data?.event || null;
  const whitelabel = event?.whitelabel || {};

  const cssVars = useMemo(
    () => ({
      "--portal-primary": whitelabel.primaryColor || DEFAULT_PRIMARY,
      "--portal-bg": whitelabel.backgroundColor || DEFAULT_BG,
    }),
    [whitelabel.primaryColor, whitelabel.backgroundColor]
  );

  const logoUrl = whitelabel.logo || whitelabel.logoUrl || null;

  const handleRsvp = async (response, optional) => {
    try {
      await rsvpMutation.mutateAsync({
        token: code,
        response,
        data: { invitationCode: code, ...(optional || {}) },
      });
      setSubmittedResponse(response);
    } catch (err) {
      if (isReplaySuccess(err)) {
        setSubmittedResponse(response);
      }
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page} style={cssVars}>
        <PortalSkeleton />
      </div>
    );
  }

  if (loadError || !guest || !event) {
    return (
      <div className={styles.page} style={cssVars}>
        <div className={styles.errorWrap}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2>{t("guestPortal.errors.title", "Unable to load invitation")}</h2>
          <p className={styles.errorMessage}>{pickErrorCopy(loadError, t)}</p>
        </div>
      </div>
    );
  }

  const finalResponse = submittedResponse || guest.rsvp?.response;

  if (finalResponse === "confirmed") {
    return (
      <div className={styles.page} style={cssVars}>
        <PortalConfirmed
          guestName={guest.name}
          event={event}
          whitelabel={whitelabel}
          logoUrl={logoUrl}
          code={code}
          formatDate={formatDate}
          t={t}
        />
      </div>
    );
  }

  if (finalResponse === "declined" || finalResponse === "maybe") {
    return (
      <div className={styles.page} style={cssVars}>
        <PortalThankYou
          response={finalResponse}
          event={event}
          whitelabel={whitelabel}
          logoUrl={logoUrl}
          t={t}
        />
      </div>
    );
  }

  const errorCopy =
    rsvpMutation.isError && !isReplaySuccess(rsvpMutation.error)
      ? pickErrorCopy(rsvpMutation.error, t)
      : null;

  return (
    <div className={styles.page} style={cssVars}>
      <PortalRsvpForm
        guest={guest}
        event={event}
        whitelabel={whitelabel}
        logoUrl={logoUrl}
        isPending={rsvpMutation.isPending}
        onSubmit={handleRsvp}
        errorCopy={errorCopy}
        formatDate={formatDate}
        t={t}
      />
    </div>
  );
}
