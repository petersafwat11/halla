"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useReportPostEventContent } from "@/hooks/postEvent";
import styles from "./postMediaGallery.module.css";

/**
 * Facebook-style media gallery for the host's uploaded photos & videos.
 * Layout adapts to the item count (1 / 2 / 3 / 4+). A click opens a simple
 * full-screen lightbox. Videos render inline with native controls.
 */
const MediaItem = ({ item, className, onOpen }) => {
  const isVideo = item.type === "video";
  if (isVideo) {
    return (
      <div className={`${styles.tile} ${className || ""}`}>
        <video
          className={styles.media}
          src={item.url}
          controls
          playsInline
          preload="metadata"
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      className={`${styles.tile} ${className || ""}`}
      onClick={() => onOpen(item)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.media} src={item.url} alt="" loading="lazy" />
    </button>
  );
};

const PostMediaGallery = ({ media = [], eventId }) => {
  const { t } = useTranslation("postEvent");
  const [lightbox, setLightbox] = useState(null);
  const report = useReportPostEventContent();

  const reportMedia = (item) => {
    if (!eventId || !item?._id || report.isPending) return;
    report.mutate(
      {
        eventId,
        targetType: "post_event_media",
        targetId: item._id,
        reason: "other",
      },
      {
        onSuccess: () =>
          toast.success(t("report.submitted", "Reported. Our team will review this.")),
        onError: () => toast.error(t("report.failed", "Couldn't submit the report.")),
      }
    );
  };

  if (!media.length) return null;

  const count = media.length;
  const layoutClass =
    count === 1
      ? styles.one
      : count === 2
      ? styles.two
      : count === 3
      ? styles.three
      : styles.many;

  // For 4+ items show the first 4 with a "+N" overlay on the last tile.
  const visible = count > 4 ? media.slice(0, 4) : media;
  const remaining = count - 4;

  return (
    <>
      <div className={`${styles.grid} ${layoutClass}`}>
        {visible.map((item, idx) => {
          const isLastWithMore = count > 4 && idx === 3;
          return (
            <div key={item._id || idx} className={styles.cell} style={{ position: "relative" }}>
              <MediaItem item={item} onOpen={setLightbox} />
              {eventId ? (
                <button
                  type="button"
                  onClick={() => reportMedia(item)}
                  disabled={report.isPending}
                  aria-label={t("report.report", "Report")}
                  title={t("report.report", "Report")}
                  style={{
                    position: "absolute",
                    top: 6,
                    insetInlineEnd: 6,
                    background: "rgba(0,0,0,0.45)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 999,
                    width: 28,
                    height: 28,
                    cursor: "pointer",
                    fontSize: 13,
                    lineHeight: "28px",
                    padding: 0,
                  }}
                >
                  ⚑
                </button>
              ) : null}
              {isLastWithMore && (
                <button
                  type="button"
                  className={styles.moreOverlay}
                  onClick={() => setLightbox(media[4])}
                >
                  +{remaining}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {lightbox && (
        <div
          className={styles.lightbox}
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className={styles.lightboxClose}
            aria-label={t("aria.close")}
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
          <div
            className={styles.lightboxInner}
            onClick={(e) => e.stopPropagation()}
          >
            {lightbox.type === "video" ? (
              <video
                className={styles.lightboxMedia}
                src={lightbox.url}
                controls
                autoPlay
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.lightboxMedia} src={lightbox.url} alt="" />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PostMediaGallery;
