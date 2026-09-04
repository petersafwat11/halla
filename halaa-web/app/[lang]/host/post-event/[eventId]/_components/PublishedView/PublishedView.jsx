"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { FaUserCircle } from "react-icons/fa";
import Button from "@/ui/commen/button/Button";
import { useUnpublishPostEventContent } from "@/hooks/postEvent";
import { handleError } from "@/services/errorHandlingService";
import PostMediaGallery from "@/components/postEvent/PostMediaGallery";
import CommentList from "@/components/postEvent/CommentList";
import LikesPopup from "@/components/postEvent/LikesPopup";
import { formatDate, formatDateTime } from "@halaa/shared/utils/locale";
import styles from "./publishedView.module.css";



const PublishedView = ({ eventId, content, hostName, eventDate }) => {
  const { t, i18n } = useTranslation("postEvent");
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const unpublish = useUnpublishPostEventContent();

  const caption = content?.title || "";
  const media = Array.isArray(content?.media) ? content.media : [];
  const likes = Array.isArray(content?.likes) ? content.likes : [];
  const comments = Array.isArray(content?.comments) ? content.comments : [];
  const likesCount = content?.likesCount ?? likes.length;
  const commentsCount = content?.commentsCount ?? comments.length;
  const lastSend = content?.stats?.lastSend || null;

  const onUnpublish = () => {
    unpublish.mutate(
      { eventId },
      {
        onSuccess: () => {
          toast.success(t("host.unpublishSuccess"));
          setConfirmUnpublish(false);
        },
        onError: (error) => {
          handleError(error, t);
          toast.error(t("host.errors.publishFailed"));
          setConfirmUnpublish(false);
        },
      }
    );
  };

  return (
    <div className={styles.wrap}>
      {/* Status + delivery summary */}
      <section className={styles.summaryCard}>
        <div className={styles.statusRow}>
          <span className={styles.dotPublished} />
          <span className={styles.statusText}>{t("host.statusPublished")}</span>
        </div>

        {lastSend?.at ? (
          <>
            <div className={styles.deliveryGrid}>
              <div className={styles.deliveryStat}>
                <span className={styles.statValue}>{lastSend.total ?? 0}</span>
                <span className={styles.statLabel}>
                  {t("host.publishNotify.notified")}
                </span>
              </div>
              <div className={styles.deliveryStat}>
                <span className={styles.statValue}>{lastSend.whatsapp ?? 0}</span>
                <span className={styles.statLabel}>WhatsApp</span>
              </div>
              <div className={styles.deliveryStat}>
                <span className={styles.statValue}>{lastSend.sms ?? 0}</span>
                <span className={styles.statLabel}>SMS</span>
              </div>
              <div className={styles.deliveryStat}>
                <span className={styles.statValue}>{lastSend.failed ?? 0}</span>
                <span className={styles.statLabel}>
                  {t("host.publishNotify.failed")}
                </span>
              </div>
            </div>
            <p className={styles.sentAt}>
              {t("host.publishNotify.sentAt", {
                time: formatDateTime(lastSend.at, i18n.language),
              })}
            </p>
          </>
        ) : (
          <p className={styles.muted}>{t("host.publishNotify.notSentYet")}</p>
        )}

        <div className={styles.actions}>
          <Button
            variant="danger"
            size="small"
            title={t("host.unpublish")}
            disabled={unpublish.isPending}
            onClick={() => setConfirmUnpublish(true)}
          />
        </div>
      </section>

      {/* Live post — identical structure to what guests see */}
      <section className={styles.postCard}>
        <div className={styles.postHeader}>
          <FaUserCircle className={styles.postAvatar} />
          <div className={styles.postHeaderText}>
            <span className={styles.postHostName}>{hostName}</span>
            <span className={styles.postDate}>
              {formatDate(eventDate, i18n.language)}
            </span>
          </div>
        </div>

        {caption && <p className={styles.caption}>{caption}</p>}

        {media.length > 0 && <PostMediaGallery media={media} />}

        <div className={styles.countsRow}>
          <button
            type="button"
            className={styles.likesButton}
            onClick={() => setShowLikes(true)}
            disabled={likesCount === 0}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#e74c3c" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 20.25C12 20.25 2.625 15 2.625 8.62501C2.625 7.49803 3.01546 6.40585 3.72996 5.53431C4.44445 4.66277 5.43884 4.0657 6.54393 3.84468C7.64903 3.62366 8.79657 3.79235 9.79131 4.32204C10.7861 4.85174 11.5665 5.70972 12 6.75001C12.4335 5.70972 13.2139 4.85174 14.2087 4.32204C15.2034 3.79235 16.351 3.62366 17.4561 3.84468C18.5612 4.0657 19.5555 4.66277 20.27 5.53431C20.9845 6.40585 21.375 7.49803 21.375 8.62501C21.375 15 12 20.25 12 20.25Z" />
            </svg>
            <span>{t("counts.likes", { count: likesCount })}</span>
          </button>
          <span className={styles.commentCount}>
            {t("counts.comments", { count: commentsCount })}
          </span>
        </div>

        <div className={styles.divider} />

        <CommentList
          comments={comments}
          locale={i18n.language}
          emptyText={t("comments.empty")}
        />
      </section>

      {showLikes && (
        <LikesPopup
          likes={likes}
          title={t("host.publishNotify.likesTitle")}
          emptyText={t("host.publishNotify.noLikes")}
          closeLabel={t("aria.close")}
          onClose={() => setShowLikes(false)}
        />
      )}

      {confirmUnpublish && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>
              {t("host.unpublishConfirmTitle")}
            </h3>
            <p className={styles.modalMessage}>
              {t("host.unpublishConfirmMessage")}
            </p>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                size="small"
                title={t("host.cancel")}
                onClick={() => setConfirmUnpublish(false)}
              />
              <Button
                variant="danger"
                size="small"
                title={t("host.confirm")}
                onClick={onUnpublish}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublishedView;
