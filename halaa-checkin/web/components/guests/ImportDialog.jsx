'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
import { Icon } from '../ui/Icon.jsx';
import { useSession } from '../../hooks/useSession.jsx';
import { pendingImports } from '../../lib/pendingImports.js';
import { api } from '../../lib/api.js';
import { getDictionary, t } from '../../lib/locale.js';
import styles from './ImportDialog.module.css';

const AR_CSV_TEMPLATE = `﻿name,allowedCompanions,companionNames,reference
أحمد حسن,2,سارة حسن|عمر حسن,INV-001
نورة عبدالله,0,,INV-002
محمد المنصور,1,فيصل المنصور,INV-003
`;

const EN_CSV_TEMPLATE = `﻿name,allowedCompanions,companionNames,reference
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
  const [isDragging, setIsDragging] = useState(false);
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
    setIsDragging(false);
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

  const processFile = (selected) => {
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

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    processFile(selected);
  };

  const removeFile = () => {
    fileGenRef.current += 1;
    setIsLoadingPreview(false);
    setIdempotencyKey('');
    setPreviewData(null);
    setFile(null);
    setCsvContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const errorsCount = previewData?.errors?.length || 0;
  const warningsCount = previewData?.warnings?.length || 0;
  const numberFormat = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ar-SA');

  const footer = step === 'upload' ? (
    <>
      <Button variant="ghost" onClick={onClose}>
        {t(dict, 'common.cancel')}
      </Button>
      <Button
        variant="primary"
        onClick={handleGeneratePreview}
        disabled={!file || !csvContent}
        loading={isLoadingPreview}
        leadingIcon="eye"
        data-testid="preview-csv-btn"
      >
        {t(dict, 'imports.previewButton')}
      </Button>
    </>
  ) : (
    <>
      <Button
        variant="ghost"
        onClick={() => { setStep('upload'); setIdempotencyKey(''); }}
        disabled={isCommitting || uncertain}
        leadingIcon={<Icon name="arrow-left" size="sm" mirror />}
      >
        {t(dict, 'imports.backToUpload')}
      </Button>
      <Button
        variant="primary"
        onClick={handleCommit}
        disabled={!previewData?.canCommit || errorsCount > 0}
        loading={isCommitting}
        leadingIcon="check"
        data-testid="commit-import-btn"
      >
        {t(dict, previewData?.validCount === 1 ? 'imports.commitButtonSingle' : 'imports.commitButton', { count: previewData?.validCount || 0 })}
      </Button>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t(dict, 'imports.title')}
      description={step === 'upload' ? t(dict, 'imports.subtitle') : t(dict, 'imports.previewTitle')}
      icon="file-spreadsheet"
      size="lg"
      maxWidth="720px"
      closeAriaLabel={t(dict, 'dialog.close')}
      footer={footer}
    >
      <div className={styles.container}>
        {step === 'upload' ? (
          <>
            {previewError && (
              <Notice variant="error" message={t(dict, `errors.${previewError.code}`) || previewError.message} />
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,text/csv"
              className="sr-only"
              tabIndex={-1}
              onChange={handleFileChange}
              data-testid="csv-file-input"
            />

            {!file ? (
              <div
                className={`${styles.dropzone} ${isDragging ? styles.dropzoneDragging : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
              >
                <span className={styles.dropzoneIcon} aria-hidden="true">
                  <Icon name="upload" size="lg" />
                </span>
                <span className={styles.dropzoneText}>{t(dict, 'imports.dropCsv')}</span>
                <span className={styles.dropzoneSubtext}>{t(dict, 'imports.maxFileNotice')}</span>
                <span className={styles.dropzoneButton}>{t(dict, 'imports.chooseFile')}</span>
              </div>
            ) : (
              <div className={styles.selectedFile}>
                <span className={styles.fileIcon} aria-hidden="true">
                  <Icon name="file-spreadsheet" size="md" />
                </span>
                <span className={styles.fileInfo}>
                  <span className={styles.fileName} dir="auto">{file.name}</span>
                  <span className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</span>
                </span>
                <Button variant="ghost" size="sm" leadingIcon="x" onClick={removeFile}>
                  {t(dict, 'imports.removeFile')}
                </Button>
              </div>
            )}

            <div className={styles.templateRow}>
              <div className={styles.templateText}>
                <span className={styles.templateTitle}>{t(dict, 'imports.templateTitle')}</span>
                <span className={styles.templateHint}>{t(dict, 'imports.templateHint')}</span>
              </div>
              <div className={styles.templateButtons}>
                <Button
                  variant="outline"
                  size="sm"
                  leadingIcon="download"
                  onClick={() => downloadTemplate(AR_CSV_TEMPLATE, 'guests-template-ar.csv')}
                  data-testid="template-ar-btn"
                >
                  {t(dict, 'imports.templateAr')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leadingIcon="download"
                  onClick={() => downloadTemplate(EN_CSV_TEMPLATE, 'guests-template-en.csv')}
                  data-testid="template-en-btn"
                >
                  {t(dict, 'imports.templateEn')}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.previewSummary}>
            {commitError && (
              <Notice variant="error" message={t(dict, `errors.${commitError.code}`) || commitError.message} />
            )}

            <div className={styles.summaryCards}>
              <div className={`${styles.summaryCard} ${previewData?.canCommit ? styles.summarySuccess : ''}`}>
                <span className={styles.summaryLabel}>{t(dict, 'imports.readyCount')}</span>
                <span className={styles.summaryCount}>{numberFormat.format(previewData?.validCount || 0)}</span>
              </div>
              <div className={`${styles.summaryCard} ${errorsCount > 0 ? styles.summaryError : ''}`}>
                <span className={styles.summaryLabel}>{t(dict, 'imports.errorCount')}</span>
                <span className={styles.summaryCount}>{numberFormat.format(errorsCount)}</span>
              </div>
              <div className={`${styles.summaryCard} ${warningsCount > 0 ? styles.summaryWarning : ''}`}>
                <span className={styles.summaryLabel}>{t(dict, 'imports.warningCount')}</span>
                <span className={styles.summaryCount}>{numberFormat.format(warningsCount)}</span>
              </div>
              {previewData?.remainingCapacity !== undefined && (
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>{t(dict, 'imports.capacityLeft')}</span>
                  <span className={styles.summaryCount}>{numberFormat.format(previewData.remainingCapacity)}</span>
                </div>
              )}
            </div>

            {errorsCount > 0 && (
              <div className={styles.issueBlock}>
                <span className={styles.issueHeading}>
                  <Icon name="alert-circle" size="sm" />
                  {t(dict, 'imports.cannotCommitErrors')}
                </span>
                <ul className={styles.issuesList} data-testid="import-errors-list">
                  {previewData.errors.map((err, idx) => {
                    const msg = typeof err === 'string' ? err : (err?.message || '');
                    const row = typeof err === 'string' ? null : (err?.row ?? err?.lineNumber ?? null);
                    const field = typeof err === 'string' ? null : (err?.field || null);
                    return (
                      <li key={idx} className={`${styles.issueItem} ${styles.issueError}`}>
                        {row != null && <strong>{t(dict, 'imports.line', { line: row })}</strong>}
                        <span>{field ? `[${field}] ` : ''}{msg}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {warningsCount > 0 && (
              <div className={styles.issueBlock}>
                <span className={`${styles.issueHeading} ${styles.issueHeadingWarning}`}>
                  <Icon name="warning" size="sm" />
                  {t(dict, 'imports.warnings', { count: warningsCount })}
                </span>
                <ul className={styles.issuesList}>
                  {previewData.warnings.map((warn, idx) => {
                    const msg = typeof warn === 'string' ? warn : (warn?.message || '');
                    const row = typeof warn === 'string' ? null : (warn?.row ?? warn?.lineNumber ?? null);
                    return (
                      <li key={idx} className={`${styles.issueItem} ${styles.issueWarning}`}>
                        {row != null && <strong>{t(dict, 'imports.line', { line: row })}</strong>}
                        <span>{msg}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {(previewData?.rows?.length || 0) > 0 && (
              <div className={styles.previewTableWrap} data-testid="import-preview-rows">
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>{t(dict, 'imports.columnLine')}</th>
                      <th>{t(dict, 'imports.columnGuest')}</th>
                      <th>{t(dict, 'imports.columnCompanions')}</th>
                      <th>{t(dict, 'imports.columnReference')}</th>
                      <th aria-label={t(dict, 'common.status')} />
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.map((r, idx) => {
                      const rowErrors = (r.errors || []).map((e) => (typeof e === 'string' ? e : e?.message)).filter(Boolean);
                      return (
                        <React.Fragment key={idx}><tr className={r.valid ? '' : styles.rowInvalid}>
                          <td className="tabular">{r.row ?? r.lineNumber ?? idx + 2}</td>
                          <td>
                            <span dir="auto" className={styles.rowName}>{r.data?.name || '—'}</span>

                            {rowErrors.length > 0 && <span className={styles.rowError}>{rowErrors.join('; ')}</span>}
                          </td>
                          <td className="tabular">{r.data?.allowedCompanions ?? '—'}</td>
                          <td><bdi>{r.data?.reference || '—'}</bdi></td>
                          <td>
                            <span className={`${styles.rowStatus} ${r.valid ? styles.rowStatusOk : styles.rowStatusBad}`}>
                              <Icon name={r.valid ? 'check' : 'x'} size="sm" />
                            </span>
                          </td>
                        </tr>
                        {r.data?.companionNames?.length > 0 && <tr className={styles.companionRow}>
                          <td />
                          <td colSpan={4}>
                            <span className={styles.companionLabel}>{t(dict, 'imports.companionNames')}</span>
                            <div className={styles.companionList}>{r.data.companionNames.map((name, index) => <span key={index} dir="auto">{name}</span>)}</div>
                          </td>
                        </tr>}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
