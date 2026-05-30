"use client";
import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useHostPostEventContent } from "@/hooks/postEvent";
import MediaGrid from "./_components/MediaGrid/MediaGrid";
import MediaUploader from "./_components/MediaUploader/MediaUploader";
import MessagingTemplatePicker from "./_components/MessagingTemplatePicker/MessagingTemplatePicker";
import ThankYouEditor from "./_components/ThankYouEditor/ThankYouEditor";
import PublishControls from "./_components/PublishControls/PublishControls";
import AccessLinksDialog from "./_components/AccessLinksDialog/AccessLinksDialog";
import PostEventStatsBar from "./_components/PostEventStatsBar/PostEventStatsBar";
import styles from "./hostPostEvent.module.css";

const HostPostEventPage = () => {
  const { t } = useTranslation("postEvent");
  const { eventId } = useParams();
  const [showAccessLinks, setShowAccessLinks] = useState(false);

  const {
    data: response,
    isLoading,
    error,
  } = useHostPostEventContent(eventId);

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
  const thankYouMessage = payload.thankYouMessage || {
    text: "",
    textAr: "",
  };
  const media = content?.media || [];
  const savedTemplate = content?.taqnyatTemplate || { templateRef: null };
  const isPublished = !!content?.settings?.isPublished;
  const lastChannelBreakdown = content?.stats?.lastSendChannelBreakdown || null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("host.title")}</h1>
        <p className={styles.subtitle}>
          {event?.eventDetails?.title || ""}
        </p>
      </header>

      <PostEventStatsBar
        media={media}
        content={content}
        lastChannelBreakdown={lastChannelBreakdown}
      />

      <section className={`${styles.section} ${styles.fullWidth}`}>
        <h2 className={styles.sectionTitle}>{t("host.media.title")}</h2>
        <MediaUploader
          eventId={eventId}
          onError={(err) =>
            toast.error(err?.message || t("host.errors.uploadFailed"))
          }
        />
        <MediaGrid eventId={eventId} media={media} />
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.section}>
          <ThankYouEditor
            eventId={eventId}
            initial={thankYouMessage}
            initialDescription={{
              description: content?.description || "",
              descriptionAr: content?.descriptionAr || "",
            }}
          />
        </section>

        <section className={styles.section}>
          <MessagingTemplatePicker
            eventId={eventId}
            savedTemplateRef={savedTemplate?.templateRef || null}
          />
        </section>
      </div>

      <section className={`${styles.section} ${styles.fullWidth}`}>
        <PublishControls
          eventId={eventId}
          isPublished={isPublished}
          hasMedia={media.length > 0}
          hasTemplate={!!savedTemplate?.templateRef}
          onSendAccessLinks={() => setShowAccessLinks(true)}
        />
      </section>

      {showAccessLinks && (
        <AccessLinksDialog
          eventId={eventId}
          savedTemplateRef={savedTemplate?.templateRef || null}
          onClose={() => setShowAccessLinks(false)}
        />
      )}
    </div>
  );
};

export default HostPostEventPage;
