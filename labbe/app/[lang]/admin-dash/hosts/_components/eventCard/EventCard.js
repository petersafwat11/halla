"use client";
import React from "react";
import styles from "./eventCard.module.css";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

const EventCard = ({ data }) => {
  const router = useRouter();
  const pathname = usePathname();
  const lang = pathname?.split("/")[1] === "en" ? "en" : "ar";
  const { t } = useTranslation("adminHosts");

  const getStatusText = (status) => {
    switch (status) {
      case "ended":
        return t("hostDetails.ended");
      case "active":
        return t("hostDetails.active");
      case "suspended":
        return t("hostDetails.suspended");
      default:
        return t("hostDetails.active");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.data}>
        <div className={styles.header}>
          <h3 className={styles.title}>{data?.title}</h3>
          <p
            className={`${styles.status} ${
              data?.status === "ended" ? styles.ended : ""
            }`}
          >
            {getStatusText(data?.status)}
          </p>
        </div>
        <div className={styles.dataItem}>
          <Image
            src="/svg/admin/people.svg"
            alt={t("hostDetails.guests")}
            width={24}
            height={24}
          />
          <p className={styles.dataItemText}>
            {data?.guestListLength} {t("hostDetails.guests")}
          </p>
        </div>
        <div className={styles.dataItem}>
          <Image
            src="/svg/admin/calendar.svg"
            alt="calendar"
            width={24}
            height={24}
          />
          <p className={styles.dataItemText}>
            {data?.date} - {data?.time}
          </p>
        </div>
        <div className={styles.dataItem}>
          <Image
            src="/svg/admin/location.svg"
            alt="location"
            width={24}
            height={24}
          />
          <p className={styles.dataItemText}>
            {data?.location?.address +
              // data?.location?.latitude +
              // data?.location?.longitude +
              data?.location?.city ||
              // data?.location?.country
              t("hostDetails.noLocation")}
          </p>
        </div>
      </div>
      <div className={styles.statsContainer}>
        <div className={styles.stats}>
          <div className={styles.yes}>
            <p className={styles.answerText}>
              {t("hostDetails.confirmed")} <span>{data?.totalConfirmed}</span>
            </p>
          </div>
          <div className={styles.no}>
            <p className={styles.answerText}>
              {t("hostDetails.declined")} <span>{data?.totalDeclined}</span>
            </p>
          </div>
          <div className={styles.maybe}>
            <p className={styles.answerText}>
              {t("hostDetails.pending")} <span>{data?.totalPending}</span>
            </p>
          </div>
        </div>
      </div>
      <button
        className={styles.seeStats}
        onClick={() => {
          router.push(`/${lang}/admin-dash/events/${data?.id || data?._id}`);
        }}
      >
        <Image
          src="/svg/admin/diagram.svg"
          alt={t("hostDetails.viewStats")}
          width={24}
          height={24}
        />
        {t("hostDetails.viewStats")}
      </button>
    </div>
  );
};

export default EventCard;
