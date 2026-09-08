'use client';

import { useTranslation } from 'react-i18next';
import Button from '@/ui/commen/button/Button';
import styles from './hub.module.css';

export default function RsvpForm({ invitation }) {
  const { t } = useTranslation('businessGuestHub');
  const { formRef, fields, setField, saving, respond, changing, cancelChange } =
    invitation;
  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        respond('confirmed');
      }}
      className={styles.form}
      aria-busy={saving}
    >
      <fieldset disabled={saving}>
        <legend>{t('responseTitle')}</legend>
        <p className={styles.formHelp}>{t('responseHelp')}</p>
        <div className={styles.field}>
          <label htmlFor="business-message">
            {t('message')}
            <span>{t('optional')}</span>
          </label>
          <textarea
            id="business-message"
            maxLength={500}
            rows={3}
            value={fields.message}
            onChange={(event) => setField('message', event.target.value)}
          />
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="business-dietary">
              {t('dietary')}
              <span>{t('optional')}</span>
            </label>
            <textarea
              id="business-dietary"
              maxLength={200}
              rows={2}
              value={fields.dietaryRestrictions}
              onChange={(event) =>
                setField('dietaryRestrictions', event.target.value)
              }
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="business-plus">{t('plus')}</label>
            <input
              id="business-plus"
              type="number"
              inputMode="numeric"
              min="0"
              max="10"
              step="1"
              required
              aria-describedby="business-plus-help"
              value={fields.plusOnes}
              onChange={(event) =>
                setField(
                  'plusOnes',
                  event.target.value === '' ? '' : Number(event.target.value),
                )
              }
            />
            <small id="business-plus-help">{t('plusHelp')}</small>
          </div>
        </div>
        <div className={styles.responses}>
          <Button
            type="submit"
            variant="primary"
            title={t('confirm')}
            disabled={saving}
            className={styles.confirmBtn}
          />
          <Button
            type="button"
            variant="secondary"
            title={t('decline')}
            disabled={saving}
            onClick={() => respond('declined')}
            className={styles.declineBtn}
          />
          {changing && (
            <button
              type="button"
              className={styles.cancel}
              onClick={cancelChange}
            >
              {t('cancel')}
            </button>
          )}
        </div>
      </fieldset>
      {saving && <p role="status" className={styles.savingText}>{t('saving')}</p>}
    </form>
  );
}
