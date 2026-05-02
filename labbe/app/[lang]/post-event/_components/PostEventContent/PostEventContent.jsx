"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import PageHeader from "../PageHeader/PageHeader";
import UserInfo from "../UserInfo/UserInfo";
import InvitationCard from "../InvitationCard/InvitationCard";
import ActionButtons from "../ActionButtons/ActionButtons";
import CommentSection from "../CommentSection/CommentSection";
import styles from "./postEventContent.module.css";

const PostEventContent = () => {
  const { t } = useTranslation("postEvent");
  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <PageHeader title={t("pageTitle")} />

        <div className={styles.postCard}>
          <div className={styles.postHeader}>
            <UserInfo name={t("personName")} date={t("date")} />
          </div>

          <div className={styles.eventTitle}>{t("eventTitle")}</div>

          <InvitationCard t={t} />

          <div className={styles.bottomSection}>
            <ActionButtons />
          </div>

          <div className={styles.commentDivider}></div>

          <CommentSection t={t} />
        </div>
      </div>
    </div>
  );
};

export default PostEventContent;
