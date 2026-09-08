'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';
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

  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setFile(null);
      setCsvContent('');
      setIdempotencyKey('');
      setPreviewData(null);
      setPreviewError(null);
      setCommitError(null);
    }
  }, [isOpen]);

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
    if (!selected) return;

    if (selected.size > 2 * 1024 * 1024) {
      setPreviewError({ message: t(dict, 'imports.maxFileNotice') });
      return;
    }

    setFile(selected);
    setPreviewError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result || '');
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const handleGeneratePreview = async () => {
    if (!csvContent) return;

    setIsLoadingPreview(true);
    setPreviewError(null);

    try {
      const response = await api.post(`/events/${eventId}/imports/preview`, {
        csv: csvContent,
      });
      setPreviewData(response.data);
      // Generate stable idempotency key for this import session
      setIdempotencyKey(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `import-${Date.now()}`);
      setStep('preview');
    } catch (err) {
      setPreviewError(err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleCommit = async () => {
    if (!csvContent || !idempotencyKey) return;

    setIsCommitting(true);
    setCommitError(null);

    try {
      await api.post(
        `/events/${eventId}/imports/commit`,
        { csv: csvContent },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      setCommitError(err);
    } finally {
      setIsCommitting(false);
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

            {/* List of row errors if any */}
            {(previewData?.errors?.length || 0) > 0 && (
              <div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#b42318' }}>
                  {t(dict, 'imports.cannotCommitErrors')}
                </span>
                <div className={styles.issuesList} data-testid="import-errors-list">
                  {previewData.errors.map((err, idx) => (
                    <div key={idx} className={`${styles.issueItem} ${styles.issueError}`}>
                      <strong>{t(dict, 'imports.line', { line: err.row })}:</strong>{' '}
                      {err.field ? `[${err.field}] ` : ''}
                      {err.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* List of warnings if any */}
            {(previewData?.warnings?.length || 0) > 0 && (
              <div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#b54708' }}>
                  ⚠️ {t(dict, 'imports.warnings', { count: previewData.warnings.length })}:
                </span>
                <div className={styles.issuesList}>
                  {previewData.warnings.map((warn, idx) => (
                    <div key={idx} className={`${styles.issueItem} ${styles.issueWarning}`}>
                      <strong>{t(dict, 'imports.line', { line: warn.row })}:</strong> {warn.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.footerActions}>
              <Button
                variant="ghost"
                onClick={() => setStep('upload')}
                disabled={isCommitting}
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
