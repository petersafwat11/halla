"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import PageHeader from "../PageHeader/PageHeader";
import UserInfo from "../UserInfo/UserInfo";
import InvitationCard from "../InvitationCard/InvitationCard";
import ActionButtons from "../ActionButtons/ActionButtons";
import CommentSection from "../CommentSection/CommentSection";
import styles from "./postEventContent.module.css";

const PostEventContent = ({ content, eventInfo, guestInfo, guestId, eventId, loading }) => {
  const { t } = useTranslation("postEvent");

  if (loading) {
    return (
      <div className={styles.container}>
        <SimpleLoading message={t("loading")} />
      </div>
    );
  }

  const eventDate =
    eventInfo?.eventDetails?.date || eventInfo?.date || "";

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <PageHeader title={t("pageTitle")} />

        <div className={styles.postCard}>
          <div className={styles.postHeader}>
            <UserInfo
              name={guestInfo?.name || t("personName")}
              date={eventDate}
              avatarUrl={guestInfo?.avatarUrl}
            />
          </div>

          <InvitationCard event={eventInfo} />

          <div className={styles.bottomSection}>
            <ActionButtons
              eventId={eventId}
              postId={content?._id}
              post={content}
              guestId={guestId}
            />
          </div>

          <div className={styles.commentDivider}></div>

          <CommentSection eventId={eventId} postId={content?._id} />
        </div>
      </div>
    </div>
  );
};

export default PostEventContent;
