"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePaymentLinksConfig, useCreatePaymentLink, useAdminPaymentLinkDetail } from "@/hooks/admin";
import usePaymentLinkDialog from "./usePaymentLinkDialog";
import { handleError } from "@/services/errorHandlingService";
import styles from "./AdminPaymentsClient.module.css";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import MoneyAmount from "@/ui/commen/MoneyAmount/MoneyAmount";
import { paymentLinkFormSchema, normalizePaymentLinkAmount } from "@/utils/schemas/paymentLinks";
import { formatDateTime } from "@halaa/shared/utils/locale";

export default function CreatePaymentLinkDialog({ open, onClose, onCreated }) {
  const { t, i18n } = useTranslation("adminPayments");
  const isArabic = i18n.language === "ar";
  const { data: configData, isLoading: configLoading, error: configError, refetch: reloadConfig } = usePaymentLinksConfig({ enabled: !!open });
  const cfg = configData?.data || {};
  const expiryChoices = cfg.expiryChoicesDays || [1, 7, 30];
  const defaultExpiry = cfg.defaultExpiryDays || 7;

  const methods = useForm({
    resolver: zodResolver(paymentLinkFormSchema(cfg, t)),
    defaultValues: { amountSar: "", description: "", clientLabel: "", expiresInDays: defaultExpiry },
    mode: "onBlur",
  });
  const { watch, setValue, reset } = methods;
  const amountSar = watch("amountSar");
  const expiresInDays = watch("expiresInDays");
  const [fieldError, setFieldError] = useState(null);
  const [createdResult, setResult] = useState(null);
  const { data: liveResult } = useAdminPaymentLinkDetail(createdResult?.id, { enabled: !!open && !!createdResult?.id });
  const result = liveResult?.data || createdResult;
  const [copied, setCopied] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const attempt = useRef(null);
  const submitting = useRef(false);
  const dialogRef = usePaymentLinkDialog(open, onClose);
  const createMutation = useCreatePaymentLink();
  const actorId = cfg.actorId;
  const storageKey = actorId ? `halaa-payment-link-attempt:${actorId}` : null;
  const saveAttempt = (value) => {
    try {
      if (storageKey) {
        if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
        else sessionStorage.removeItem(storageKey);
      }
    } catch { /* Storage may be disabled; in-memory retries still use the same key. */ }
  };
  useEffect(() => {
    attempt.current = null;
    setResult(null);
    reset({ amountSar: "", description: "", clientLabel: "", expiresInDays: defaultExpiry });
    setIdempotencyKey(crypto.randomUUID());
    try {
      const saved = storageKey ? JSON.parse(sessionStorage.getItem(storageKey) || "null") : null;
      if (!saved?.payload || typeof saved.key !== "string") return;
      attempt.current = saved.payload;
      setIdempotencyKey(saved.key);
      setValue("amountSar", saved.payload.amountSar || "");
      setValue("description", saved.payload.description || "");
      setValue("clientLabel", saved.payload.clientLabel || "");
      setValue("expiresInDays", saved.payload.expiresInDays);
      if (saved.result) setResult(saved.result);
    } catch { /* Invalid local state is ignored; the dashboard still lists durable requests. */ }
  // The actor boundary owns attempt restoration; config loading must not erase edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (open) {
      setFieldError(null);
      setCopied(false);
      if (!idempotencyKey) {
        setIdempotencyKey(
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`
        );
      }
      // Focus first input + trap focus inside dialog.
      const timer = setTimeout(() => dialogRef.current?.querySelector("input")?.focus(), 50);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!attempt.current) setValue("expiresInDays", defaultExpiry);
  }, [defaultExpiry, setValue]);

  if (!open) return null;

  const normalized = normalizePaymentLinkAmount(amountSar);
  const amountValid = normalized !== "" && /^\d{1,7}(\.\d{1,2})?$/.test(normalized);
  const expiryDate = new Date(Date.now() + Number(expiresInDays || 7) * 86400000);

  const handleSubmit = async (values) => {
    if (submitting.current || !cfg.canCreate) return;
    setFieldError(null);
    setCopied(false);
    try {
      submitting.current = true;
      attempt.current ||= {
        amountSar: values.amountSar,
        description: values.description || undefined,
        clientLabel: values.clientLabel || undefined,
        expiresInDays: values.expiresInDays, locale: isArabic ? "ar" : "en",
      };
      saveAttempt({ key: idempotencyKey, payload: attempt.current });
      const res = await createMutation.mutateAsync({
        data: attempt.current,
        idempotencyKey,
      });
      setResult(res?.data || res);
      saveAttempt({ key: idempotencyKey, payload: attempt.current, result: res?.data || res });
      onCreated?.(res?.data || res);
    } catch (err) {
      if ([400, 401, 403, 422, 429].includes(err?.response?.status)) { attempt.current = null; saveAttempt(null); }
      // Keep entered values on errors. Uncertain (202-style) creation stays
      // explicit — do not invite blind recreation.
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        t("links.create.failed", "Could not create the link");
      setFieldError(msg);
      handleError(err, t);
    } finally {
      submitting.current = false;
    }
  };

  const handleCopy = async () => {
    const url = result?.url || result?.hostedUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const handleCreateAnother = () => {
    attempt.current = null;
    saveAttempt(null);
    setResult(null);
    setCopied(false);
    reset({ amountSar: "", description: "", clientLabel: "", expiresInDays: defaultExpiry });
    setIdempotencyKey(
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
  };

  return (
    <PopupLayout isOpen={open} onClose={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t("links.create.title", "Create payment link")}
        className={styles.dialogContent}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.modalTitle}>{t("links.create.title", "Create payment link")}</h2>
        {!result ? (
          <FormProvider {...methods}><form onSubmit={methods.handleSubmit(handleSubmit)} noValidate>
            {configError && <p role="alert">{t("errors.loadFailed")} <Button variant="secondary" title={t("links.actions.retry")} onClick={reloadConfig} /></p>}
            <fieldset disabled={configLoading || createMutation.isPending || !!attempt.current} className={styles.formFields}>
              <InputGroup name="amountSar" type="text" inputMode="decimal" direction="ltr" required label={t("links.create.amount")} placeholder="250.00" hintMessage={t("links.create.amountHint")} />
              <InputGroup name="description" type="text" maxLength={200} label={t("links.create.description")} placeholder={t("links.create.descriptionPlaceholder")} />
              <InputGroup name="clientLabel" type="text" maxLength={100} label={t("links.create.clientLabel")} placeholder={t("links.create.clientLabelPlaceholder")} />
              <InputSelect name="expiresInDays" label={t("links.create.expiresAfter")} disabled={createMutation.isPending || !!attempt.current}
                options={expiryChoices.map(value => ({ value, label: value === 1 ? t("links.create.expiry24h") : t("links.create.expiryDays", { count: value }) }))} />
              <p className={styles.hint}>{t("links.create.expiryPreview", { date: formatDateTime(expiryDate, isArabic ? "ar" : "en") })}</p>
              {amountValid && <div className={styles.summary}><MoneyAmount amount={Number(normalized)} currency="SAR" locale={isArabic ? "ar" : "en"} /></div>}
            </fieldset>
            {fieldError && (
              <p role="alert" className={styles.errorText}>
                {fieldError}
              </p>
            )}
            <div className={styles.modalActions}>
              <Button type="button" onClick={onClose} variant="secondary" title={t("actions.cancel", "Cancel")} />
              <Button
                type="submit"
                disabled={createMutation.isPending || !cfg.canCreate}
               variant="primary" title={createMutation.isPending
                  ? t("links.create.creating", "Creating…")
                  : t("links.create.submit", "Create link")} />
            </div>
          </form></FormProvider>
        ) : (
          <div>
            {result.creationState === "creation_failed" ? (
              <p role="alert">{t("links.create.rejected", "The provider could not create this link. You can create a new request.")}</p>
            ) : result.creationState && result.creationState !== "ready" ? (
              <p role="status">
                {t(
                  "links.create.stillCreating",
                  "Still creating — checking with the payment provider (ref {{ref}})",
                  { ref: result.reference }
                )}
              </p>
            ) : (
              <p role="status">
                {t("links.create.success", "Link ready — copy it and send it using your preferred channel.")}
              </p>
            )}
            <div className={styles.detailGrid}>
              <span className={styles.detailLabel}>{t("links.columns.amount", "Amount")}</span>
              <span className={styles.detailValue}><MoneyAmount amount={Number(result.amountSar)} currency="SAR" locale={isArabic ? "ar" : "en"} /></span>
              <span className={styles.detailLabel}>{t("links.columns.reference", "Reference")}</span>
              <span className={styles.detailMono}>{result.reference}</span>
              <span className={styles.detailLabel}>{t("links.columns.expiry", "Expiry")}</span>
              <span className={styles.detailValue}>
                {result.expiresAt ? formatDateTime(result.expiresAt, isArabic ? "ar" : "en") : "—"}
              </span>
              <span className={styles.detailLabel}>{t("links.detail.url", "Payment URL")}</span>
              <span className={styles.detailMono} dir="ltr" style={{ unicodeBidi: "plaintext" }}>
                {result.url || result.hostedUrl || "—"}
              </span>
            </div>
            {result.creationState === "ready" && ["awaiting_payment", "processing"].includes(result.status) && !result.cancelPending && (result.url || result.hostedUrl) && (
              <>
                <div className={styles.modalActions} style={{ justifyContent: "flex-start" }}>
                  <Button type="button" onClick={handleCopy} variant="primary" title={t("links.actions.copy", "Copy link")} />
                </div>
                {copied ? (
                  <p role="status">{t("links.create.copied", "Copied")}</p>
                ) : (
                  <p className={styles.hint}>
                    {t(
                      "links.create.copyHint",
                      "If copying fails, long-press / select the URL above to copy it manually."
                    )}
                  </p>
                )}
              </>
            )}
            <div className={styles.modalActions}>
              <Button type="button" onClick={onClose} variant="secondary" title={t("links.create.done", "Done")} />
              <Button type="button" onClick={handleCreateAnother} disabled={!["ready", "creation_failed"].includes(result.creationState)} variant="secondary" title={t("links.create.createAnother", "Create another")} />
            </div>
          </div>
        )}
      </div>
    </PopupLayout>
  );
}
