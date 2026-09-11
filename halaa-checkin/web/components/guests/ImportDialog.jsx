'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { useSession } from '../../hooks/useSession.jsx';
import { pendingImports } from '../../lib/pendingImports.js';
import { api } from '../../lib/api.js';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './ImportDialog.module.css';

const AR_CSV_TEMPLATE = `\uFEFFname,allowedCompanions,companionNames,reference
أحمد حسن,2,سارة حسن|عمر حسن,INV-001
نورة عبدالله,0,,INV-002
محمد المنصور,1,فيصل المنصور,INV-003
`;

const EN_CSV_TEMPLATE = `\uFEFFname,allowedCompanions,companionNames,reference
Ahmed Hassan,2,Sara Hassan|Omar Hassan,INV-001
Noura Abdullah,0,,INV-002
Mohammed Al-Mansoor,1,Faisal Al-Mansoor,INV-003
`;

/**
 * 2-step CSV import dialog:
 * Step 1: Upload file & template download.
 * Step 2: Non-destructive preview with row errors/warnings and atomic commit with stable idempotency key.
 */
export function ImportDialog({
  isOpen,
  onClose,
  eventId,
  onSuccess,
  lang = 'ar',
}) {
  const dict = getDictionary(lang);
  const { user } = useSession();
  const actorId = user?.id;
  const committingRef = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const fileInputRef = useRef(null);

  const [step, setStep] = useState('upload'); // 'upload' | 'preview'
  const [file, setFile] = useState(null);
  const [csvContent, setCsvContent] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState(null);
  // F15: bind preview/body/key to its event; guard async file/preview callbacks.
  const previewEventIdRef = useRef(eventId);
  const fileGenRef = useRef(0);

  useEffect(() => {
    fileGenRef.current += 1;
    previewEventIdRef.current = eventId;
    committingRef.current = false;
    setIsCommitting(false);
    setIsLoadingPreview(false);
    const pending = pendingImports.get(actorId, eventId);
    setStep(pending ? 'preview' : 'upload');
    setFile(null);
    setCsvContent(pending?.csv || '');
    setIdempotencyKey(pending?.key || '');
    setPreviewData(pending?.preview || null);
    setPreviewError(null);
    setCommitError(pending ? { code: 'LOST_RESPONSE' } : null);
    setUncertain(!!pending);
    return () => { fileGenRef.current += 1; };
  }, [isOpen, eventId, actorId]);

  const downloadTemplate = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected || uncertain) return;
    fileGenRef.current += 1;
    setCsvContent('');
    setPreviewData(null);
    setIdempotencyKey('');
    setIsLoadingPreview(false);

    if (selected.size > 2 * 1024 * 1024) {
      setPreviewError({ message: t(dict, 'imports.maxFileNotice') });
      return;
    }

    setFile(selected);
    setPreviewError(null);

    const gen = fileGenRef.current + 1;
    fileGenRef.current = gen;
    const capturedEventId = eventId;
    const reader = new FileReader();
    reader.onload = (event) => {
      // F15: guard stale reads (file replaced/removed or event switched).
      if (gen !== fileGenRef.current || capturedEventId !== previewEventIdRef.current) return;
      setCsvContent(event.target?.result || '');
    };
    reader.onerror = () => {
      if (gen !== fileGenRef.current) return;
      setPreviewError({ message: t(dict, 'imports.maxFileNotice') });
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const handleGeneratePreview = async () => {
    if (!csvContent || uncertain || isLoadingPreview) return;
    // F15: preview is bound to its event; stale results cannot populate a new event.
    const capturedEventId = eventId;
    const gen = fileGenRef.current;

    setIsLoadingPreview(true);
    setPreviewError(null);

    try {
      const response = await api.post(`/events/${capturedEventId}/imports/preview`, {
        csv: csvContent,
      });
      if (gen !== fileGenRef.current || capturedEventId !== previewEventIdRef.current) return;
      setPreviewData({ ...response.data, _eventId: capturedEventId });
      // Generate stable idempotency key for this import session (once per preview).
      setIdempotencyKey(crypto.randomUUID());
      setStep('preview');
    } catch (err) {
      if (gen !== fileGenRef.current || capturedEventId !== previewEventIdRef.current) return;
      setPreviewError(err);
    } finally {
      if (gen === fileGenRef.current && capturedEventId === previewEventIdRef.current) {
        setIsLoadingPreview(false);
      }
    }
  };

  const handleCommit = async () => {
    if (committingRef.current || !csvContent || !idempotencyKey || previewData?._eventId !== eventId) return;
    const gen = fileGenRef.current;
    const capturedEvent = eventId;
    const pending = pendingImports.get(actorId, eventId) || { csv: csvContent, key: idempotencyKey, preview: previewData };
    pendingImports.set(actorId, eventId, pending);
    committingRef.current = true;
    setIsCommitting(true);
    setUncertain(true);
    setCommitError(null);
    try {
      await api.post(`/events/${capturedEvent}/imports/commit`, { csv: pending.csv }, { headers: { 'Idempotency-Key': pending.key } });
      pendingImports.delete(actorId, capturedEvent);
      if (gen !== fileGenRef.current) return;
      setUncertain(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      const unknown = !err.status || err.status >= 500 || err.status === 401 || err.code === 'LOST_RESPONSE';
      if (!unknown) pendingImports.delete(actorId, capturedEvent);
      if (gen !== fileGenRef.current) return;
      setUncertain(unknown);
      setCommitError(err);
    } finally {
      if (gen === fileGenRef.current) {
        committingRef.current = false;
        setIsCommitting(false);
      }
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t(dict, 'imports.title')}
      maxWidth="540px"
      closeAriaLabel={t(dict, 'dialog.close')}
    >
      <div className={styles.container}>
        {step === 'upload' ? (
          <>
            {previewError && (
              <Notice
                variant="error"
                message={t(dict, `errors.${previewError.code}`) || previewError.message}
              />
            )}

            {/* Template Download Section */}
            <div className={styles.templateRow}>
              <span className={styles.templateText}>
                📄 {t(dict, 'imports.downloadTemplate')}:
              </span>
              <div className={styles.templateButtons}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadTemplate(AR_CSV_TEMPLATE, 'guests-template-ar.csv')}
                  data-testid="template-ar-btn"
                >
                  {t(dict, 'imports.templateAr')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadTemplate(EN_CSV_TEMPLATE, 'guests-template-en.csv')}
                  data-testid="template-en-btn"
                >
                  {t(dict, 'imports.templateEn')}
                </Button>
              </div>
            </div>

            {/* File Upload Dropzone */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              data-testid="csv-file-input"
            />

            {!file ? (
              <div
                className={styles.dropzone}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
              >
                <span style={{ fontSize: '32px' }} aria-hidden="true">
                  📂
                </span>
                <span className={styles.dropzoneText}>{t(dict, 'imports.dropCsv')}</span>
                <span className={styles.dropzoneSubtext}>{t(dict, 'imports.maxFileNotice')}</span>
                <Button variant="secondary" size="sm" type="button">
                  {t(dict, 'imports.chooseFile')}
                </Button>
              </div>
            ) : (
              <div className={styles.selectedFileBar}>
                <span>📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    fileGenRef.current += 1;
                    setIsLoadingPreview(false);
                    setIdempotencyKey('');
                    setPreviewData(null);
                    setFile(null);
                    setCsvContent('');
                  }}
                >
                  ✕ {lang === 'ar' ? 'إزالة' : 'Remove'}
                </Button>
              </div>
            )}

            <div className={styles.footerActions}>
              <Button variant="ghost" onClick={onClose}>
                {t(dict, 'common.cancel')}
              </Button>

              <Button
                variant="primary"
                onClick={handleGeneratePreview}
                disabled={!file || !csvContent}
                loading={isLoadingPreview}
                data-testid="preview-csv-btn"
              >
                👁️ {lang === 'ar' ? 'معاينة الملف' : 'Preview Import'}
              </Button>
            </div>
          </>
        ) : (
          /* Step 2: Preview & Commit */
          <div className={styles.previewSummary}>
            {commitError && (
              <Notice
                variant="error"
                message={t(dict, `errors.${commitError.code}`) || commitError.message}
              />
            )}

            <div className={styles.summaryCards}>
              <div className={`${styles.summaryCard} ${previewData?.canCommit ? styles.summaryCardSuccess : ''}`}>
                <span className={styles.summaryTitle}>
                  {t(dict, 'imports.validRows', { count: previewData?.validCount || 0 })}
                </span>
                <span className={`${styles.summaryCount} ${styles.summaryCountSuccess}`}>
                  {previewData?.validCount || 0}
                </span>
              </div>

              <div
                className={`${styles.summaryCard} ${(previewData?.errors?.length || 0) > 0 ? styles.summaryCardError : ''}`}
              >
                <span className={styles.summaryTitle}>
                  {t(dict, 'imports.invalidRows', { count: previewData?.errors?.length || 0 })}
                </span>
                <span
                  className={`${styles.summaryCount} ${(previewData?.errors?.length || 0) > 0 ? styles.summaryCountError : ''}`}
                >
                  {previewData?.errors?.length || 0}
                </span>
              </div>
            </div>

            {previewData?.remainingCapacity !== undefined && (
              <div style={{ fontSize: '13px', color: 'var(--color-natural-450, #656565)' }}>
                {t(dict, 'imports.remainingCapacity', { count: previewData.remainingCapacity })}
              </div>
            )}

            {/* List of row errors if any (F13: structured + legacy string tolerance) */}
            {(previewData?.errors?.length || 0) > 0 && (
              <div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#b42318' }}>
                  {t(dict, 'imports.cannotCommitErrors')}
                </span>
                <div className={styles.issuesList} data-testid="import-errors-list">
                  {previewData.errors.map((err, idx) => {
                    const msg = typeof err === 'string' ? err : (err?.message || '');
                    const row = typeof err === 'string' ? null : (err?.row ?? err?.lineNumber ?? null);
                    const field = typeof err === 'string' ? null : (err?.field || null);
                    return (
                      <div key={idx} className={`${styles.issueItem} ${styles.issueError}`}>
                        {row != null && <><strong>{t(dict, 'imports.line', { line: row })}:</strong>{' '}</>}
                        {field ? `[${field}] ` : ''}
                        {msg}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Valid/invalid preview rows (F13: review records before commit) */}
            {(previewData?.rows?.length || 0) > 0 && (
              <div>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>
                  {t(dict, 'imports.previewTitle')} ({previewData.rows.length})
                </span>
                <div
                  className={styles.issuesList}
                  data-testid="import-preview-rows"
                  style={{ maxHeight: '220px', overflowY: 'auto' }}
                >
                  {previewData.rows.map((r, idx) => (
                    <div key={idx} className={`${styles.issueItem} ${r.valid ? '' : styles.issueError}`}>
                      <strong>{t(dict, 'imports.line', { line: r.row ?? r.lineNumber ?? (idx + 2) })}:</strong>{' '}
                      {r.data?.name || ''}{' '}
                      {t(dict, 'guests.allowedCompanions')}: {r.data?.allowedCompanions ?? '—'}{' '}
                      {Array.isArray(r.data?.companionNames) ? r.data.companionNames.join('، ') : ''}
                      {r.data?.reference ? ` (${r.data.reference})` : ''}{' '}
                      — {r.valid ? '✓' : '✗'}{' '}
                      {(r.errors || []).map((e) => (typeof e === 'string' ? e : e?.message)).filter(Boolean).join('; ')}
                    </div>
                  ))}

                </div>
              </div>
            )}

            {/* List of warnings if any (F13: structured + legacy tolerance) */}
            {(previewData?.warnings?.length || 0) > 0 && (
              <div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#b54708' }}>
                  ⚠️ {t(dict, 'imports.warnings', { count: previewData.warnings.length })}:
                </span>
                <div className={styles.issuesList}>
                  {previewData.warnings.map((warn, idx) => {
                    const msg = typeof warn === 'string' ? warn : (warn?.message || '');
                    const row = typeof warn === 'string' ? null : (warn?.row ?? warn?.lineNumber ?? null);
                    return (
                      <div key={idx} className={`${styles.issueItem} ${styles.issueWarning}`}>
                        {row != null && <><strong>{t(dict, 'imports.line', { line: row })}:</strong>{' '}</>}
                        {msg}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={styles.footerActions}>
              <Button
                variant="ghost"
                onClick={() => { setStep('upload'); setIdempotencyKey(''); }}
                disabled={isCommitting || uncertain}
              >
                ← {lang === 'ar' ? 'اختيار ملف آخر' : 'Back to upload'}
              </Button>

              <Button
                variant="primary"
                onClick={handleCommit}
                disabled={!previewData?.canCommit || (previewData?.errors?.length || 0) > 0}
                loading={isCommitting}
                data-testid="commit-import-btn"
              >
                {t(dict, 'imports.commitButton', { count: previewData?.validCount || 0 })}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
