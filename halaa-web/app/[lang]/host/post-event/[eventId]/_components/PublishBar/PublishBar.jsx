"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import Button from "@/ui/commen/button/Button";
import { createPostEventAttemptId, usePublishAndNotify } from "@/hooks/postEvent";
import { handleError } from "@/services/errorHandlingService";
import styles from "./publishBar.module.css";

const FILTERS = ["attended", "confirmed", "all"];

/**
 * Draft-state footer: pick the audience and "Publish & notify" in one action.
 * On success the host content query invalidates and the page flips to the
 * published view. Disabled until the post has media AND a saved template.
 */
const PublishBar = ({ eventId, hasMedia, hasTemplate }) => {
  const { t } = useTranslation("postEvent");
  const [filter, setFilter] = useState("attended");
  const publishAndNotify = usePublishAndNotify();

  const disabled = !hasMedia || !hasTemplate || publishAndNotify.isPending;
  const hint = !hasMedia
    ? t("host.media.empty")
    : !hasTemplate
    ? t("host.accessLinks.noTemplateConfigured")
    : "";

  const onPublish = () => {
    const attemptId = createPostEventAttemptId('publish-notify');
    publishAndNotify.mutate(
      { eventId, data: { filter }, attemptId },
      {
        onSuccess: (resp) => {
          const summary = resp?.data || {};
          // The post is published either way; notify is best-effort.
          if (summary.notified === false) {
            if (summary.notifyReason === "no_template") {
              toast.warning(t("host.accessLinks.noTemplateConfigured"));
            } else {
              toast.warning(t("host.publishNotify.publishedNoNotify"));
            }
            return;
          }
          const breakdown = summary.channelBreakdown || {};
          toast.success(
            t("host.publishNotify.success", {
              sent: summary.sent ?? 0,
              whatsapp: breakdown.whatsapp ?? 0,
              sms: breakdown.sms ?? 0,
              failed: breakdown.failed ?? 0,
            })
          );
        },
        onError: (error) => {
          // Only reached if publish itself failed (missing content / event).
          handleError(error, t);
          toast.error(t("host.errors.publishFailed"));
        },
      }
    );
  };

  return (
    <div className={styles.bar}>
      <div className={styles.audience}>
        <span className={styles.audienceLabel}>
          {t("host.accessLinks.filterTitle")}
        </span>
        <div className={styles.options}>
          {FILTERS.map((opt) => (
            <label
              key={opt}
              className={`${styles.chip} ${filter === opt ? styles.chipActive : ""}`}
            >
              <input
                type="radio"
                name="audience"
                value={opt}
                checked={filter === opt}
                onChange={() => setFilter(opt)}
                className={styles.radio}
              />
              {t(
                `host.accessLinks.filter${opt.charAt(0).toUpperCase()}${opt.slice(1)}`
              )}
            </label>
          ))}
        </div>
      </div>

      <span title={hint} className={styles.publishWrap}>
        <Button
          variant="primary"
          title={
            publishAndNotify.isPending
              ? t("host.publishNotify.sending")
              : t("host.publishNotify.button")
          }
          disabled={disabled}
          onClick={onPublish}
        />
      </span>
    </div>
  );
};

export default PublishBar;
