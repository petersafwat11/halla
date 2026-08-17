"use client";
import React, { useState } from "react";
import styles from "../page.module.css";

export default function PortalRsvpForm({
  guest,
  event,
  isPending,
  onSubmit,
  errorCopy,
  formatDate,
  t,
}) {
  const [message, setMessage] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [plusOnes, setPlusOnes] = useState(0);

  const submit = (response) => {
    const optional = {};
    if (message.trim()) optional.message = message.trim();
    if (dietaryRestrictions.trim())
      optional.dietaryRestrictions = dietaryRestrictions.trim();
    if (Number(plusOnes) > 0) optional.plusOnes = Number(plusOnes);
    onSubmit(response, optional);
  };

  return (
    <div className={styles.card}>
      <h1 className={styles.eventName}>{event.title}</h1>
      {event.hostName ? (
        <p className={styles.hostLine}>
          {t("guestPortal.hostedBy", "Hosted by {{host}}", {
            host: event.hostName,
          })}
        </p>
      ) : null}

      <ul className={styles.detailsList}>
        {event.date ? (
          <li>
            <span className={styles.detailLabel}>
              {t("guestPortal.fields.date", "Date")}:
            </span>
            {formatDate(event.date)}
            {event.time ? ` · ${event.time}` : ""}
          </li>
        ) : null}
        {event.location?.name || event.location?.address ? (
          <li>
            <span className={styles.detailLabel}>
              {t("guestPortal.fields.venue", "Venue")}:
            </span>
            {event.location?.name || event.location?.address}
          </li>
        ) : null}
      </ul>

      <p className={styles.message}>
        {t(
          "guestPortal.invite.greeting",
          "Hi {{name}}, will you be joining us?",
          { name: guest.name }
        )}
      </p>

      <div className={styles.optionalForm}>
        <label htmlFor="rsvp-message">
          {t("guestPortal.fields.message", "Message (optional)")}
        </label>
        <textarea
          id="rsvp-message"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t(
            "guestPortal.fields.messagePlaceholder",
            "Add a note for the host"
          )}
        />
        <label htmlFor="rsvp-diet">
          {t("guestPortal.fields.dietary", "Dietary restrictions (optional)")}
        </label>
        <input
          id="rsvp-diet"
          type="text"
          value={dietaryRestrictions}
          onChange={(e) => setDietaryRestrictions(e.target.value)}
        />
        <label htmlFor="rsvp-plus-ones">
          {t("guestPortal.fields.plusOnes", "Plus ones (optional)")}
        </label>
        <input
          id="rsvp-plus-ones"
          type="number"
          min={0}
          max={10}
          value={plusOnes}
          onChange={(e) => setPlusOnes(e.target.value)}
        />
      </div>

      <div className={styles.buttonRow}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnConfirm}`}
          disabled={isPending}
          onClick={() => submit("confirmed")}
        >
          {t("guestPortal.actions.confirm", "Confirm")}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnDecline}`}
          disabled={isPending}
          onClick={() => submit("declined")}
        >
          {t("guestPortal.actions.decline", "Decline")}
        </button>
      </div>

      {errorCopy ? (
        <p className={styles.errorMessage} style={{ marginTop: "1rem" }}>
          {errorCopy}
        </p>
      ) : null}
    </div>
  );
}
