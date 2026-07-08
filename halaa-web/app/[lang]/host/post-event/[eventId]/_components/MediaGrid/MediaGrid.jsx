"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useDeletePostEventMedia } from "@/hooks/postEvent";
import { handleError } from "@/services/errorHandlingService";
import styles from "./mediaGrid.module.css";

const MediaTile = ({ item, onDelete, deleting }) => {
  const { t } = useTranslation("postEvent");
  const isVideo = item?.type === "video";

  return (
    <div className={styles.tile}>
      {isVideo ? (
        <video
          className={styles.media}
          src={item.url}
          controls
          preload="metadata"
        />
      ) : (
        <img className={styles.media} src={item.url} alt="" />
      )}

      <button
        type="button"
        className={styles.deleteButton}
        onClick={onDelete}
        disabled={deleting}
        aria-label={t("host.media.deleteConfirm")}
      >
        {deleting ? "…" : "✕"}
      </button>

      <span className={styles.typeBadge}>
        {isVideo ? t("host.summary.videos") : t("host.summary.photos")}
      </span>
    </div>
  );
};

const MediaGrid = ({ eventId, media = [] }) => {
  const { t } = useTranslation("postEvent");
  const deleteMedia = useDeletePostEventMedia();
  const [pendingId, setPendingId] = useState(null);

  if (!media.length) {
    return <p className={styles.emptyState}>{t("host.media.empty")}</p>;
  }

  const handleDelete = (mediaId) => {
    if (!window.confirm(t("host.media.deleteConfirm"))) return;
    setPendingId(mediaId);
    deleteMedia.mutate(
      { eventId, mediaId },
      {
        onSuccess: () => {
          setPendingId(null);
        },
        onError: (error) => {
          setPendingId(null);
          handleError(error, t);
          toast.error(t("host.errors.deleteFailed"));
        },
      }
    );
  };

  return (
    <div className={styles.grid}>
      {media.map((item) => (
        <MediaTile
          key={item._id}
          item={item}
          deleting={pendingId === item._id}
          onDelete={() => handleDelete(item._id)}
        />
      ))}
    </div>
  );
};

export default MediaGrid;
