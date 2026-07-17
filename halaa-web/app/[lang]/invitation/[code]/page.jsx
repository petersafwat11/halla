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
import PortalInfoOnly from "./_components/PortalInfoOnly";

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
  const { code, lang } = useParams();
  const { t } = useTranslation("guest-portal");
  const { formatDate } = useLocalizedDate();

  const { data, isLoading, error: loadError } = useGuestByToken(code);
  const rsvpMutation = useGuestMutation("rsvp");

  const [submittedResponse, setSubmittedResponse] = useState(null);
  // When true, the guest tapped "Change my response" — re-show the form even
  // though a prior response is already stored.
  const [isChanging, setIsChanging] = useState(false);

  const guest = data?.data?.guest || data?.guest || null;
  const event = data?.data?.event || data?.event || null;

  const cssVars = useMemo(
    () => ({
      "--portal-primary": DEFAULT_PRIMARY,
      "--portal-bg": DEFAULT_BG,
    }),
    []
  );

  const handleRsvp = async (response, optional) => {
    try {
      await rsvpMutation.mutateAsync({
        // `/guests/:id/rsvp` validates `:id` as an ObjectId — send the guest
        // id here, NOT the qrcode `code`. The qrcode stays as `invitationCode`
        // in the body (the route's authz proof) and as `token` for cache
        // invalidation (the portal query is keyed by the code).
        id: guest?.id || guest?._id,
        token: code,
        response,
        data: {
          invitationCode: code,
          lang: lang === "ar" ? "ar" : "en",
          ...(optional || {}),
        },
      });
      setSubmittedResponse(response);
      setIsChanging(false);
    } catch (err) {
      if (isReplaySuccess(err)) {
        setSubmittedResponse(response);
        setIsChanging(false);
      }
    }
  };

  // Re-open the RSVP form so the guest can switch their answer. The next
  // submit overwrites the stored response server-side and swaps the screen.
  const handleChangeResponse = () => {
    setSubmittedResponse(null);
    setIsChanging(true);
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

  // Invitation type governs whether the RSVP form appears and whether a QR
  // pass is shown. The backend computes these flags on the event payload.
  const { allowsReply, includesQr } = event;

  const finalResponse = isChanging
    ? null
    : submittedResponse || guest.rsvp?.response;
  const guestsCount = 1 + Math.max(0, Number(guest.rsvp?.plusOnes) || 0);

  // No-reply invitation types (qr_only / none): never show the RSVP form.
  // qr_only shows the entry pass directly; none shows an info-only card.
  if (!allowsReply) {
    return (
      <div className={styles.page} style={cssVars}>
        {includesQr ? (
          <PortalConfirmed
            mode="pass"
            showQr
            guestName={guest.name}
            event={event}
            code={code}
            guestsCount={guestsCount}
            formatDate={formatDate}
            t={t}
          />
        ) : (
          <PortalInfoOnly
            guestName={guest.name}
            event={event}
            formatDate={formatDate}
            t={t}
          />
        )}
      </div>
    );
  }

  if (finalResponse === "confirmed") {
    return (
      <div className={styles.page} style={cssVars}>
        <PortalConfirmed
          mode="confirmed"
          showQr={includesQr}
          guestName={guest.name}
          event={event}
          code={code}
          guestsCount={guestsCount}
          formatDate={formatDate}
          onChangeResponse={handleChangeResponse}
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
          guestName={guest.name}
          event={event}
          onChangeResponse={handleChangeResponse}
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
        isPending={rsvpMutation.isPending}
        onSubmit={handleRsvp}
        errorCopy={errorCopy}
        formatDate={formatDate}
        t={t}
      />
    </div>
  );
}
