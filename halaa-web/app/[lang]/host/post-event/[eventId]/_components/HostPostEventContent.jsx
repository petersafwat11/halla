"use client";
import React from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useHostPostEventContent } from "@/hooks/postEvent";
import MediaGrid from "../_components/MediaGrid/MediaGrid";
import MediaUploader from "../_components/MediaUploader/MediaUploader";
import MessagingTemplatePicker from "../_components/MessagingTemplatePicker/MessagingTemplatePicker";
import CaptionEditor from "../_components/CaptionEditor/CaptionEditor";
import PublishBar from "../_components/PublishBar/PublishBar";
import PublishedView from "../_components/PublishedView/PublishedView";
import styles from "../hostPostEvent.module.css";

const HostPostEventContent = () => {
  const { t } = useTranslation("postEvent");
  const { eventId } = useParams();

  const { data: response, isLoading, error } = useHostPostEventContent(eventId);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <SimpleLoading message={t("loading")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          <h2>{t("errors.accessError")}</h2>
          <p>{error?.response?.data?.message || error?.message || ""}</p>
        </div>
      </div>
    );
  }

  const payload = response?.data || {};
  const event = payload.event || null;
  const content = payload.content || {};
  const media = content?.media || [];
  const caption = content?.title || "";
  const savedTemplate = content?.taqnyatTemplate || { templateRef: null };
  const savedTemplateRef = savedTemplate?.templateRef || null;
  const isPublished = !!content?.settings?.isPublished;
  const eventTitle = event?.eventDetails?.title || payload.eventTitle || "";
  const hostName = event?.host?.name || "";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("host.title")}</h1>
        <p className={styles.subtitle}>{eventTitle}</p>
      </header>

      {isPublished ? (
        <div className={styles.composer}>
          <PublishedView
            eventId={eventId}
            content={content}
            hostName={hostName}
            eventDate={event?.eventDetails?.date}
          />
        </div>
      ) : (
        <div className={styles.composer}>
          <section className={styles.composerCard}>
            <CaptionEditor
              eventId={eventId}
              initial={caption}
              hostName={hostName}
            />
            <p className={styles.mediaLabel}>{t("host.media.title")}</p>
            <MediaUploader eventId={eventId} />
            <MediaGrid eventId={eventId} media={media} />
          </section>

          <section className={styles.section}>
            <MessagingTemplatePicker
              eventId={eventId}
              savedTemplateRef={savedTemplateRef}
            />
          </section>

          <section className={styles.section}>
            <PublishBar
              eventId={eventId}
              hasMedia={media.length > 0}
              hasTemplate={!!savedTemplateRef}
            />
          </section>
        </div>
      )}
    </div>
  );
};

export default HostPostEventContent;
