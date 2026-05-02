"use client";
import React from "react";
import styles from "./invitationsCarousel.module.css";
import { useTranslation } from "react-i18next";

const InvitationsCarousel = ({ lang = "ar" }) => {
  const { t } = useTranslation("landing");
  const invitations = Array.from({ length: 18 }, (_, i) => ({
    id: i + 1,
    image: "https://api.builder.io/api/v1/image/assets/TEMP/4e1a22cf945b85d2bcdfe1c8a0c79d99809b5e74?width=416",
  }));

  return (
    <section id="invitations" className={styles.invitationsSection}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("invitations.title")}</h2>
        <p className={styles.description}>{t("invitations.description")}</p>
      </div>

      <div className={styles.carouselWrapper}>
        <div className={styles.carousel}>
          {invitations.map((invitation) => (
            <div key={invitation.id} className={styles.invitationCard}>
              <img src={invitation.image} alt="" />
            </div>
          ))}
        </div>

        <div className={styles.indicators}>
          <span className={styles.indicator}></span>
          <span className={styles.indicator}></span>
          <span className={`${styles.indicator} ${styles.active}`}></span>
          <span className={styles.indicator}></span>
          <span className={styles.indicator}></span>
        </div>
      </div>
    </section>
  );
};

export default InvitationsCarousel;
