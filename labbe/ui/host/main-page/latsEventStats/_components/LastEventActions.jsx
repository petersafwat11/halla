"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "../LastEventStats.module.css";

export default function LastEventActions({
  event,
  isMobile,
  canSendTest,
  canSchedule,
  currentLocale,
  onTestMessage,
  onScheduleSending,
}) {
  const { t } = useTranslation("home-events");
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const isCompleted = event.status === "completed";

  const dropdownItems = [
    { label: t("lastEvent.dropdown.eventDetails"), step: 1 },
    { label: t("lastEvent.dropdown.guestList"), step: 2 },
    { label: t("lastEvent.dropdown.invitationDesign"), step: 3 },
    { label: t("lastEvent.dropdown.invitationCustomization"), step: 4 },
  ];

  const handleEditClick = (step) => {
    if (event.id) {
      router.push(
        `/${currentLocale}/host/update-event?id=${event.id}&step=${step}`,
      );
    }
    setShowDropdown(false);
  };

  const handleViewStats = () => {
    if (event.id) router.push(`/${currentLocale}/host/events/${event.id}`);
  };

  const testButton = canSendTest ? (
    <button className={styles.outlineButton} onClick={onTestMessage}>
      <span>{t("lastEvent.buttons.testMessage")}</span>
      <Image src="/svg/events/calendar-edit.svg" alt="test" width={12} height={12} />
    </button>
  ) : null;

  const scheduleButton = canSchedule ? (
    <button className={styles.outlineButton} onClick={onScheduleSending}>
      <span>{t("lastEvent.buttons.scheduleEvent")}</span>
      <Image src="/svg/events/calendar-edit.svg" alt="calendar" width={12} height={12} />
    </button>
  ) : null;

  const viewStatsButton = (
    <button className={styles.outlineButton} onClick={handleViewStats}>
      <span>{t("lastEvent.viewStats")}</span>
      <Image src="/svg/events/diagram.svg" alt="diagram" width={12} height={12} />
    </button>
  );

  const postEventButton = isCompleted ? (
    <button
      className={styles.outlineButton}
      onClick={() => router.push(`/${currentLocale}/host/post-event/${event.id}`)}
    >
      <span>{t("lastEvent.buttons.sharePostEvent", "Share post-event")}</span>
    </button>
  ) : null;

  const editDropdown = (
    <div className={styles.dropdownWrapper}>
      <button
        className={styles.primaryButton}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <Image src="/svg/events/edit.svg" alt="edit" width={12} height={12} />
        <span>{t("lastEvent.editEvent")}</span>
        <Image
          src="/svg/events/arrow-down.svg"
          alt="arrow-down"
          width={12}
          height={12}
          style={{
            transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>
      {showDropdown && (
        <div className={styles.dropdown}>
          {dropdownItems.map((item) => (
            <button
              key={item.step}
              className={styles.dropdownItem}
              onClick={() => handleEditClick(item.step)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.actionsContainer}>
      {isMobile ? (
        <>
          {editDropdown}
          <div className={styles.secondaryActions}>
            {testButton}
            {scheduleButton}
            {viewStatsButton}
            {postEventButton}
          </div>
        </>
      ) : (
        <>
          {testButton}
          {scheduleButton}
          {viewStatsButton}
          {postEventButton}
          {editDropdown}
        </>
      )}
    </div>
  );
}
