'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import useAuthStore from '@/stores/authStore';
import { apiRequest } from '@/services/http';
import { API_PATHS } from '@halaa/shared/api/paths';
import coverUtils from '@halaa/shared/constants/businessCover.cjs';
import styles from './BusinessCoverInput.module.css';

const { BUSINESS_COVER, validCoverDimensions, coverCrop } = coverUtils;
const axisLabels = { x: 'horizontal', y: 'vertical', zoom: 'zoom' };

export default function BusinessCoverInput({ owner }) {
  const user = useAuthStore((s) => s.user);
  const account = owner || user;
  const accountId = account?._id || account?.id;
  const otherOwner = Boolean(owner && accountId !== (user?._id || user?.id));
  const { lang } = useParams();
  const { t } = useTranslation('createEvent');
  const { setValue, watch } = useFormContext();
  const canvas = useRef(null);
  const source = useRef(null);
  const [image, setImage] = useState(null);
  const [position, setPosition] = useState({ x: 50, y: 50, zoom: 1 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshedLogo, setRefreshedLogo] = useState(null);
  const logo =
    refreshedLogo?.id === accountId ? refreshedLogo.avatar : account?.avatar;
  const cover = watch('coverImage');
  const [preview, setPreview] = useState('');
  const isBusiness = account?.accountType === 'business';
  useEffect(() => {
    setValue('isBusinessEvent', isBusiness);
    setValue('businessLogoMissing', isBusiness && !logo);
  }, [isBusiness, logo, setValue]);
  useEffect(() => {
    if (!(cover instanceof Blob)) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(cover);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);
  useEffect(() => {
    if (!image || !canvas.current) return;
    const crop = coverCrop(
      image.width,
      image.height,
      position.x / 100,
      position.y / 100,
      position.zoom,
    );
    canvas.current.width = crop.outputWidth;
    canvas.current.height = crop.outputHeight;
    const ctx = canvas.current.getContext('2d');
    ctx.drawImage(
      image,
      crop.originX,
      crop.originY,
      crop.width,
      crop.height,
      0,
      0,
      crop.outputWidth,
      crop.outputHeight,
    );
  }, [image, position]);
  useEffect(() => () => source.current?.close?.(), []);
  async function choose(file) {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      if (
        !BUSINESS_COVER.mimeTypes.includes(file.type) ||
        file.size > BUSINESS_COVER.bytes
      )
        throw new Error();
      const bitmap = await createImageBitmap(file);
      if (!validCoverDimensions(bitmap.width, bitmap.height)) {
        bitmap.close();
        throw new Error();
      }
      source.current?.close?.();
      source.current = bitmap;
      setImage(bitmap);
      setPosition({ x: 50, y: 50, zoom: 1 });
    } catch (_) {
      setError(t('businessCover.invalidImage'));
    } finally {
      setBusy(false);
    }
  }
  async function applyCover() {
    if (busy || !canvas.current) return;
    setBusy(true);
    setError('');
    try {
      const blob = await new Promise((resolve) =>
        canvas.current.toBlob(resolve, 'image/webp', 0.9),
      );
      if (!blob || blob.size > BUSINESS_COVER.bytes) throw new Error();
      const extension = blob.type === 'image/webp' ? 'webp' : 'png';
      setValue(
        'coverImage',
        new File([blob], `event-cover.${extension}`, { type: blob.type }),
        { shouldDirty: true, shouldValidate: true },
      );
      setImage(null);
    } catch {
      setError(t('businessCover.cropError'));
    } finally {
      setBusy(false);
    }
  }
  async function refreshLogo() {
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest({
        method: 'GET',
        path: otherOwner
          ? API_PATHS.admin.businesses.getById(accountId)
          : API_PATHS.users.getMyProfile,
      });
      const fresh = result?.data?.business || result?.data?.user;
      if (fresh)
        setRefreshedLogo({
          id: account._id || account.id,
          avatar: fresh.avatar || fresh.avatarUrl,
        });
    } catch (_) {
      setError(t('businessCover.refreshError'));
    } finally {
      setBusy(false);
    }
  }
  if (!isBusiness) return null;
  return (
    <section className={styles.section} aria-busy={busy}>
      <h3>{t('businessCover.title')}</h3>
      {!logo && (
        <div className={styles.notice}>
          <p role="alert">
            {t('businessCover.logoRequired')}{' '}
            <a
              href={
                otherOwner
                  ? `/${lang}/admin-dash/businesses/${accountId}`
                  : `/${lang}/host/settings`
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('businessCover.settings')}
            </a>
          </p>
          <button type="button" disabled={busy} onClick={refreshLogo}>
            {t('businessCover.refreshLogo')}
          </button>
        </div>
      )}
      <label htmlFor="event-cover">{t('businessCover.requirements')}</label>
      <input
        id="event-cover"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(e) => {
          choose(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {image ? (
        <div className={styles.editor}>
          <canvas
            ref={canvas}
            width={1600}
            height={900}
            className={styles.preview}
            aria-label={t('businessCover.cropPreview')}
          />
          {Object.keys(axisLabels).map((axis) => (
            <label className={styles.slider} key={axis}>
              {t(`businessCover.${axisLabels[axis]}`)}
              <input
                disabled={busy}
                type="range"
                min={axis === 'zoom' ? 1 : 0}
                max={
                  axis === 'zoom'
                    ? Math.max(
                        1,
                        Math.min(
                          image.width / BUSINESS_COVER.minWidth,
                          image.height / BUSINESS_COVER.minHeight,
                        ),
                      )
                    : 100
                }
                step={axis === 'zoom' ? 0.05 : 1}
                value={position[axis]}
                onChange={(e) =>
                  setPosition((p) => ({ ...p, [axis]: Number(e.target.value) }))
                }
              />
            </label>
          ))}
          <div className={styles.actions}>
            <button type="button" disabled={busy} onClick={applyCover}>
              {t('businessCover.apply')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setImage(null)}
            >
              {t('businessCover.cancel')}
            </button>
          </div>
        </div>
      ) : (
        preview && (
        <Image
          unoptimized
          width={1600}
          height={900}
            src={preview}
            alt={t('businessCover.preview')}
            className={styles.preview}
          />
        )
      )}
    </section>
  );
}
