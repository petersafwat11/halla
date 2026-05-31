"use client";
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import PageHeader from "../PageHeader/PageHeader";
import UserInfo from "../UserInfo/UserInfo";
import PostMediaGallery from "@/components/postEvent/PostMediaGallery";
import ActionButtons from "../ActionButtons/ActionButtons";
import CommentSection from "../CommentSection/CommentSection";
import styles from "./postEventContent.module.css";

const formatEventDate = (rawDate, locale) => {
  if (!rawDate) return "";
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale || "ar", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const PostEventContent = ({ content, eventInfo, guestId, eventId, loading }) => {
  const { t, i18n } = useTranslation("postEvent");
  const commentInputRef = useRef(null);

  if (loading) {
    return (
      <div className={styles.container}>
        <SimpleLoading message={t("loading")} />
      </div>
    );
  }

  // Host name + event details come from the populated `content` (the guest
  // token payload only carries event id + title).
  const hostName = content?.host?.name || content?.host?.username || "";
  const eventTitle =
    content?.event?.eventDetails?.title || eventInfo?.title || "";
  const eventDate = formatEventDate(
    content?.event?.eventDetails?.date,
    i18n.language
  );
  const caption = content?.title || "";
  const media = Array.isArray(content?.media) ? content.media : [];

  const likesCount = content?.likesCount || 0;
  const commentsCount = content?.commentsCount || 0;
  const userLiked = !!content?.userLiked;

  const focusComment = () => {
    commentInputRef.current?.focus?.();
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <PageHeader title={eventTitle || t("pageTitle")} />

        <div className={styles.postCard}>
          <div className={styles.postHeader}>
            <UserInfo
              name={hostName || t("personName")}
              date={eventDate}
              avatarUrl={content?.host?.avatarUrl}
            />
          </div>

          {caption && <p className={styles.caption}>{caption}</p>}

          {media.length > 0 && <PostMediaGallery media={media} />}

          {(likesCount > 0 || commentsCount > 0) && (
            <div className={styles.countsRow}>
              {likesCount > 0 && (
                <span className={styles.countItem}>
                  {t("counts.likes", { count: likesCount })}
                </span>
              )}
              {commentsCount > 0 && (
                <span className={styles.countItem}>
                  {t("counts.comments", { count: commentsCount })}
                </span>
              )}
            </div>
          )}

          <div className={styles.commentDivider}></div>

          <div className={styles.bottomSection}>
            <ActionButtons
              eventId={eventId}
              userLiked={userLiked}
              likesCount={likesCount}
              onCommentClick={focusComment}
            />
          </div>

          <div className={styles.commentDivider}></div>

          <CommentSection
            eventId={eventId}
            guestId={guestId}
            inputRef={commentInputRef}
          />
        </div>
      </div>
    </div>
  );
};

export default PostEventContent;
