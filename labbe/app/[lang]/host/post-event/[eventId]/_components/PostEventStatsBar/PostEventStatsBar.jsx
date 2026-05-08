"use client";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import styles from "./postEventStatsBar.module.css";

const Tile = ({ label, value }) => (
  <div className={styles.tile}>
    <span className={styles.value}>{value}</span>
    <span className={styles.label}>{label}</span>
  </div>
);

const PostEventStatsBar = ({ media = [], content, lastChannelBreakdown }) => {
  const { t } = useTranslation("postEvent");

  const counts = useMemo(() => {
    let photos = 0;
    let videos = 0;
    let comments = 0;
    let likes = 0;
    for (const m of media) {
      if (m.type === "video") videos += 1;
      else photos += 1;
      comments += Array.isArray(m.comments) ? m.comments.length : 0;
      likes += Array.isArray(m.likes) ? m.likes.length : 0;
    }
    return { photos, videos, comments, likes };
  }, [media]);

  const statsTotals = content?.stats || {};

  return (
    <div className={styles.bar}>
      <Tile label={t("host.summary.photos")} value={counts.photos} />
      <Tile label={t("host.summary.videos")} value={counts.videos} />
      <Tile
        label={t("host.summary.comments")}
        value={statsTotals.totalComments ?? counts.comments}
      />
      <Tile
        label={t("host.summary.likes")}
        value={statsTotals.totalLikes ?? counts.likes}
      />
      {lastChannelBreakdown && (
        <Tile
          label={t("host.summary.linksSent")}
          value={
            (lastChannelBreakdown.whatsapp ?? 0) +
            (lastChannelBreakdown.sms ?? 0)
          }
        />
      )}
    </div>
  );
};

export default PostEventStatsBar;
