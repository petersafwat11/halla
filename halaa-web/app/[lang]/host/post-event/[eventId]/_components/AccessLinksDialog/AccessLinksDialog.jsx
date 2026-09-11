"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import Button from "@/ui/commen/button/Button";
import { useHostTaqnyatTemplates } from "@/hooks/taqnyatTemplates";
import {
  useGeneratePostEventTokens,
  useSendPostEventAccessLinks,
  createPostEventAttemptId,
} from "@/hooks/postEvent";
import { handleError } from "@/services/errorHandlingService";
import styles from "./accessLinksDialog.module.css";

const FILTERS = ["attended", "confirmed", "all"];

const AccessLinksDialog = ({ eventId, savedTemplateRef, onClose, messagePreviews = {}, previouslySent = false }) => {
  const { t } = useTranslation("postEvent");
  const [filter, setFilter] = useState("attended");
  const [confirmedResend, setConfirmedResend] = useState(false);

  const initialOverrideId =
    typeof savedTemplateRef === "object" && savedTemplateRef
      ? savedTemplateRef._id
      : savedTemplateRef;
  const [overrideId, setOverrideId] = useState(initialOverrideId || "");

  const { data, isLoading } = useHostTaqnyatTemplates({
    type: "post_event",
  });
  const templates = data?.data?.templates || data?.templates || [];
  const selectedTemplate = templates.find(template => template._id === overrideId);

  const generateTokens = useGeneratePostEventTokens();
  const sendLinks = useSendPostEventAccessLinks();
  const isPending = generateTokens.isPending || sendLinks.isPending;

  const handleSend = async () => {
    if (isPending || !selectedTemplate || (previouslySent && !confirmedResend)) return;
    const body = { filter };
    if (overrideId) body.taqnyatTemplateRef = overrideId;

    try {
      await generateTokens.mutateAsync({ eventId, data: { filter } });
      const attemptId = createPostEventAttemptId('access-links');
      const result = await sendLinks.mutateAsync({ eventId, data: body, attemptId });
      const summary = result?.data || {};
      const breakdown = summary.channelBreakdown || {};
      if (!summary.sent && summary.failed) {
        toast.error(t('host.errors.sendFailed'));
        return;
      }
      (summary.failed ? toast.warning : toast.success)(
        t("host.accessLinks.success", {
          sent: summary.sent ?? 0,
          whatsapp: breakdown.whatsapp ?? 0,
          sms: breakdown.sms ?? 0,
          failed: breakdown.failed ?? 0,
        })
      );
      onClose?.();
    } catch (error) {
      const reason = error?.response?.data?.body?.reason
        || error?.response?.data?.reason;
      if (reason === "no_template") {
        toast.error(t("host.accessLinks.noTemplateConfigured"));
      } else {
        handleError(error, t);
        toast.error(t("host.errors.sendFailed"));
      }
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2 className={styles.title}>{t("host.accessLinks.title")}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t("host.cancel")}
          >
            ✕
          </button>
        </header>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {t("host.accessLinks.filterTitle")}
          </h3>
          <div className={styles.filters}>
            {FILTERS.map((opt) => (
              <label key={opt} className={styles.filterRow}>
                <input
                  type="radio"
                  name="filter"
                  value={opt}
                  checked={filter === opt}
                  onChange={() => setFilter(opt)}
                />
                <span>
                  {t(
                    `host.accessLinks.filter${opt.charAt(0).toUpperCase()}${opt.slice(1)}`
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {t("host.accessLinks.templatePicker")}
          </h3>
          {isLoading ? (
            <p className={styles.muted}>{t("loading")}</p>
          ) : templates.length === 0 ? (
            <div className={styles.emptyTemplate}>
              <p>{t("host.accessLinks.noTemplateConfigured")}</p>
            </div>
          ) : (
            <select
              className={styles.select}
              value={overrideId}
              onChange={(e) => setOverrideId(e.target.value)}
            >
              <option value="" disabled>{t('host.accessLinks.templatePicker')}</option>
              {templates.map((tpl) => (
                <option key={tpl._id} value={tpl._id}>
                  {tpl.templateName}
                </option>
              ))}
            </select>
          )}
          {!!selectedTemplate && <p dir="auto" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: '1.2rem', background: '#F9F4EF', border: '1px solid #C28E5C', borderRadius: '8px' }}>{messagePreviews[selectedTemplate._id] || selectedTemplate.bodyText}</p>}
        </div>
        {previouslySent && <label className={styles.filterRow}><input type="checkbox" checked={confirmedResend} onChange={event => setConfirmedResend(event.target.checked)} />{t('host.accessLinks.resendConfirmation')}</label>}

        <footer className={styles.footer}>
          <Button
            variant="secondary"
            size="small"
            title={t("host.cancel")}
            onClick={onClose}
            disabled={isPending}
          />
          <Button
            variant="primary"
            size="small"
            title={isPending ? "…" : t("host.accessLinks.send")}
            onClick={handleSend}
            disabled={isPending || !selectedTemplate || (previouslySent && !confirmedResend)}
          />
        </footer>
      </div>
    </div>
  );
};

export default AccessLinksDialog;
