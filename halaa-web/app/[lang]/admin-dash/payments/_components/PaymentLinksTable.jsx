"use client";
import Button from "@/ui/commen/button/Button";
import PopupLayout from "@/ui/commen/popup/PopupLayout";


import { useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  useAdminPaymentLinks,
  useRefreshPaymentLink,
  useCancelPaymentLink,
  usePaymentLinksConfig,
} from "@/hooks/admin";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { normalizePaymentLinksFilters } from "@/utils/filterNormalizer";
import Table from "@/ui/commen/new-table/Table";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import CreatePaymentLinkDialog from "./CreatePaymentLinkDialog";
import PaymentLinkDetailModal from "./PaymentLinkDetailModal";
import { getStatusVisual } from "@/utils/statusColors";
import { formatDate as sharedFormatDate } from "@halaa/shared/utils/locale";
import MoneyAmount from "@/ui/commen/MoneyAmount/MoneyAmount";
import styles from "./PaymentsTable.module.css";
import modalStyles from "./AdminPaymentsClient.module.css";
import usePaymentLinkDialog from "./usePaymentLinkDialog";

const formatDate = (dateStr, isArabic) =>
  dateStr
    ? sharedFormatDate(dateStr, isArabic ? "ar" : "en", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }) || "—"
    : "—";

export default function PaymentLinksTable() {
  const { t, i18n } = useTranslation("adminPayments");
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: configData, error: configError, refetch: reloadConfig } = usePaymentLinksConfig();
  const canManage = configData?.data?.canRefresh === true;
  const canCreate = canManage && configData?.data?.canCreate === true;

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const cancelRef = usePaymentLinkDialog(!!cancelTarget, () => setCancelTarget(null));
  const refreshMutation = useRefreshPaymentLink();
  const cancelMutation = useCancelPaymentLink();

  const filters = useMemo(
    () => normalizePaymentLinksFilters(searchParams, { limit: 20 }),
    [searchParams]
  );
  // Debounced search is handled by the Table input; the query key updates on
  // URL change. Poll every 20s while visible (query-level), no provider fan-out.
  const { data, isLoading, error, refetch } = useAdminPaymentLinks(filters);
  const links = useMemo(() => data?.data?.links || [], [data]);
  const pagination = data?.data?.pagination || { page: 1, pages: 1, total: 0 };

  const handlePageChange = useCallback(
    (page) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(page));
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // The shared Table owns search debouncing.
  const handleSearchChange = useCallback(
    (query) => {
        const params = new URLSearchParams(searchParams.toString());
        if (query) params.set("search", query);
        else params.delete("search");
        params.set("page", "1");
        router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleStatusFilter = useCallback(
    (status) => {
      const params = new URLSearchParams(searchParams.toString());
      if (status) params.set("status", status);
      else params.delete("status");
      params.set("page", "1");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleCopy = useCallback(
    async (url) => {
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        toastUtils.success(t("links.create.copied", "Copied"));
      } catch {
        toastUtils.error(
          t("links.create.copyHint", "Copy failed — select the URL manually from details.")
        );
        setDetailId(links.find((l) => (l.url || l.hostedUrl) === url)?.id || null);
      }
    },
    [t, links]
  );

  const handleRefresh = useCallback(
    async (id) => {
      try {
        const response = await refreshMutation.mutateAsync(id);
        toastUtils.success(response?.status === "pending" || response?.data?.syncPending
          ? t("links.actions.queued", "A status check is scheduled")
          : t("links.actions.refreshed", "Status updated"));
      } catch (err) {
        handleError(err, t);
      }
    },
    [refreshMutation, t]
  );

  const handleCancel = useCallback(async () => {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync({ linkId: cancelTarget.id });
      toastUtils.success(t("links.actions.canceled", "Link canceled"));
      setCancelTarget(null);
    } catch (err) {
      handleError(err, t);
    }
  }, [cancelTarget, cancelMutation, t]);

  const getRowActions = useCallback(
    (row) => {
      const link = row.original;
      const list = [];
      const active = link.creationState === "ready" && !link.cancelPending && ["awaiting_payment", "processing"].includes(link.status) && (link.url || link.hostedUrl);
      if (active) {
        list.push({
          type: "dropdown",
          text: t("links.actions.copy", "Copy link"),
          onClick: () => handleCopy(link.url || link.hostedUrl),
        });
      }
      list.push({
        type: "dropdown",
        text: t("actions.viewDetails", "View details"),
        onClick: () => setDetailId(link.id),
      });
      if (canManage) {
        list.push({
          type: "dropdown",
          text: t("links.actions.refresh", "Refresh status"),
          onClick: () => handleRefresh(link.id),
        });
        if (active) {
          list.push({
            type: "dropdown",
            text: t("links.actions.cancel", "Cancel"),
            onClick: () => setCancelTarget(link),
          });
        }
      }
      return list;
    },
    [t, canManage, handleCopy, handleRefresh]
  );

  const renderCell = useCallback(
    (key, value, row) => {
      if (key === "status") {
        const { fg, bg } = getStatusVisual(value, "payment");
        return (
          <span
            style={{
              display: "inline-flex",
              padding: "0.2rem 1rem",
              borderRadius: "999px",
              fontSize: "1.2rem",
              fontWeight: 500,
              background: bg,
              color: fg,
            }}
          >
            {t(`links.status.${value}`, value)}
            {(row.original?.syncPending || row.original?.syncStale) && <span> · {t("links.detail.syncStale")}</span>}
          </span>
        );
      }
      if (key === "amount") {
        return <MoneyAmount amount={Number(row.amountSar ?? value ?? 0)} currency="SAR" locale={isArabic ? "ar" : "en"} />;
      }
      if ((key === "createdAt" || key === "expiresAt") && value) {
        return formatDate(value, isArabic);
      }
      if (key === "url" && value) {
        return (
          <span dir="ltr" style={{ unicodeBidi: "plaintext", maxWidth: "12rem", overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", verticalAlign: "bottom" }}>
            {value}
          </span>
        );
      }
      return value ?? "—";
    },
    [t, isArabic]
  );

  const tableData = useMemo(
    () =>
      links.map((l) => ({
        id: l.id,
        reference: l.reference,
        client: l.clientLabel ? `${l.reference} — ${l.clientLabel}` : l.reference,
        description: l.description || "—",
        amount: l.amountSar,
        amountSar: l.amountSar,
        currency: "SAR",
        status: l.status,
        creator: l.creator?.name || l.creator?.email || "—",
        createdAt: l.createdAt,
        expiresAt: l.expiresAt,
        url: l.url || l.hostedUrl,
        original: l,
      })),
    [links]
  );

  if (isLoading) return <SimpleLoading />;

  const isEmpty = links.length === 0;
  const isFiltered = Boolean(filters.search || filters.status || filters.from || filters.to);

  return (
    <>
      {configError && <div role="alert" className={styles.errorState}><p>{t("errors.loadFailed")}</p><Button variant="secondary" onClick={() => reloadConfig()} title={t("links.actions.retry")} /></div>}
      {configData?.data?.environment === "test" && <p className={modalStyles.hint} role="status">{t("links.testMode")}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "1rem", marginBlockEnd: "1.2rem" }}>
        {isFiltered && <Button variant="secondary" onClick={() => router.push("?", { scroll: false })} title={t("links.filters.clear", "Clear filters")} />}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBlockEnd: "1.2rem" }}>
        {canManage && (
          <Button disabled={!canCreate} onClick={() => setCreateOpen(true)} title={t("links.create.title", "Create payment link")} />
        )}
      </div>
      {canManage && !canCreate && <p role="status" className={modalStyles.hint}>{t("links.create.disabledByConfig")}</p>}
      {error ? (
        <div className={styles.errorState} role="alert">
          <p>{t("errors.loadFailed", "Failed to load payments")}</p>
          <Button variant="secondary" onClick={() => refetch()} title={t("links.actions.retry", "Retry")} />
        </div>
      ) : isEmpty ? (
        <div className={styles.errorState} style={{ background: "var(--color-natural-150)", color: "var(--color-natural-700)" }}>
          <p role="status">
            {isFiltered
              ? t("links.empty.filtered", "No payment links match these filters.")
              : t("links.empty.title", "No payment links yet. Create one and share the link with your client.")}
          </p>
          {canCreate && !isFiltered && (
            <Button onClick={() => setCreateOpen(true)} title={t("links.create.title", "Create payment link")} />
          )}
        </div>
      ) : (
        <div className={styles.container}>
          <Table
            mode="server"
            title={t("links.table.title", "Payment links")}
            headers={[
              t("links.columns.reference", "Reference"),
              t("links.columns.description", "Description"),
              t("links.columns.amount", "Amount"),
              t("links.columns.status", "Status"),
              t("links.columns.creator", "Creator"),
              t("links.columns.createdAt", "Created"),
              t("links.columns.expiry", "Expiry"),
            ]}
            headerKeys={["client", "description", "amount", "status", "creator", "createdAt", "expiresAt"]}
            data={tableData}
            searchValue={filters.search}
            onSearchChange={handleSearchChange}
            activeFilter={filters.status}
            onFilterChange={handleStatusFilter}
            renderCell={renderCell}
            getRowActions={getRowActions}
            showCheckboxes={false}
            showExport={false}
            filterOptions={[
              { label: t("table.status.all", "All"), value: "", text: t("table.status.all", "All"), onClick: () => handleStatusFilter("") },
              { label: t("links.status.awaiting_payment", "Awaiting payment"), value: "awaiting_payment", text: t("links.status.awaiting_payment", "Awaiting payment"), onClick: () => handleStatusFilter("awaiting_payment") },
              { label: t("links.status.paid", "Paid"), value: "paid", text: t("links.status.paid", "Paid"), onClick: () => handleStatusFilter("paid") },
              { label: t("links.status.expired", "Expired"), value: "expired", text: t("links.status.expired", "Expired"), onClick: () => handleStatusFilter("expired") },
              { label: t("links.status.canceled", "Canceled"), value: "canceled", text: t("links.status.canceled", "Canceled"), onClick: () => handleStatusFilter("canceled") },
              { label: t("links.status.refunded", "Refunded"), value: "refunded", text: t("links.status.refunded", "Refunded"), onClick: () => handleStatusFilter("refunded") },
              { label: t("links.status.needs_review", "Needs review"), value: "needs_review", text: t("links.status.needs_review", "Needs review"), onClick: () => handleStatusFilter("needs_review") },
            ]}
            pagination={{
              currentPage: parseInt(filters.page, 10) || 1,
              totalPages: pagination.pages || 1,
              totalItems: pagination.total || 0,
              onPageChange: handlePageChange,
            }}
          />
        </div>
      )}

      <CreatePaymentLinkDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => refetch()}
      />
      <PaymentLinkDetailModal linkId={detailId} onClose={() => setDetailId(null)} />

      {cancelTarget && (
        <PopupLayout isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)}>
          <div ref={cancelRef} tabIndex={-1} className={modalStyles.dialogContent} role="dialog" aria-modal="true" aria-label={t("links.cancel.title", "Cancel payment link")}>
            <h2 className={modalStyles.modalTitle}>{t("links.cancel.title", "Cancel payment link")}</h2>
            <p>
              {t("links.cancel.confirm", "Cancel {{ref}} for SAR {{amount}}? The copied URL will stop working.", {
                ref: cancelTarget.reference,
                amount: cancelTarget.amountSar,
              })}
            </p>
            <div className={modalStyles.modalActions}>
              <Button type="button" variant="secondary" onClick={() => setCancelTarget(null)} title={t("actions.cancel", "Cancel")} />
              <Button type="button" onClick={handleCancel} disabled={cancelMutation.isPending} variant="danger" title={cancelMutation.isPending
                  ? t("links.cancel.canceling", "Canceling…")
                  : t("links.actions.cancel", "Cancel")} />
            </div>
          </div>
        </PopupLayout>
      )}
    </>
  );
}
