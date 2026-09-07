'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useParams } from 'next/navigation';
import useAuthStore from '@/stores/authStore';
import { apiRequest } from '@/services/http';
import { API_PATHS } from '@halaa/shared/api/paths';

export default function BusinessCoverInput({ owner }) {
  const user = useAuthStore(s => s.user);
  const account = owner || user;
  const { lang } = useParams();
  const ar = lang === 'ar';
  const { setValue, watch } = useFormContext();
  const canvas = useRef(null);
  const source = useRef(null);
  const [image, setImage] = useState(null);
  const [position, setPosition] = useState({ x: 50, y: 50, zoom: 1 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshedLogo, setRefreshedLogo] = useState(null);
  const logo = refreshedLogo?.id === (account?._id || account?.id) ? refreshedLogo.avatar : account?.avatar;
  const cover = watch('coverImage');
  const [preview, setPreview] = useState('');
  const isBusiness = account?.accountType === 'business';
  useEffect(() => {
    setValue('isBusinessEvent', isBusiness);
    setValue('businessLogoMissing', isBusiness && !logo);
  }, [isBusiness, logo, setValue]);
  useEffect(() => {
    if (!(cover instanceof Blob)) return;
    const url = URL.createObjectURL(cover); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);
  useEffect(() => {
    if (!image || !canvas.current) return;
    const width = Math.min(image.width, image.height * 16 / 9) / position.zoom;
    const height = width * 9 / 16;
    const ctx = canvas.current.getContext('2d');
    ctx.drawImage(image, (image.width - width) * position.x / 100, (image.height - height) * position.y / 100, width, height, 0, 0, 1600, 900);
  }, [image, position]);
  useEffect(() => () => source.current?.close?.(), []);
  async function choose(file) {
    if (!file) return;
    setError(''); setBusy(true);
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error();
      const bitmap = await createImageBitmap(file);
      if (bitmap.width < 960 || bitmap.height < 540 || bitmap.width > 8192 || bitmap.height > 8192 || bitmap.width * bitmap.height > 40000000) { bitmap.close(); throw new Error(); }
      source.current?.close?.(); source.current = bitmap; setImage(bitmap); setPosition({ x: 50, y: 50, zoom: 1 });
    } catch (_) { setError(ar ? 'اختر JPEG أو PNG أو WebP حتى 10 MB، بأبعاد من 960 × 540 إلى 8192 بكسل وبحد أقصى 40 ميجابكسل.' : 'Choose JPEG, PNG or WebP up to 10 MB, at least 960 × 540, at most 8192 pixels per side and 40 megapixels.'); }
    finally { setBusy(false); }
  }
  if (!isBusiness) return null;
  async function refreshLogo() {
    setBusy(true);
    try {
      const otherOwner = owner && owner._id !== user?._id;
      const result = await apiRequest({ method: 'GET', path: otherOwner ? API_PATHS.admin.businesses.getById(owner._id) : API_PATHS.users.getMyProfile });
      const fresh = result?.data?.business || result?.data?.user;
      if (fresh) setRefreshedLogo({ id: account._id || account.id, avatar: fresh.avatar || fresh.avatarUrl });
    } catch (_) { setError(ar ? 'تعذر تحديث الشعار. حاول مجددًا.' : 'Could not refresh the logo. Try again.'); }
    finally { setBusy(false); }
  }
  return <section style={{ marginBlock: 24, display: 'grid', gap: 12, fontSize: 16 }}>
    <h3>{ar ? 'غلاف المناسبة' : 'Event cover'}</h3>
    {!logo && <><p role="alert">{ar ? 'أضف شعار المنشأة قبل إنشاء المناسبة.' : 'Add a business logo before creating this event.'} <a href={owner && owner._id !== user?._id ? `/${lang}/admin-dash/businesses/${owner._id}` : `/${lang}/host/settings`} target="_blank" rel="noopener noreferrer">{ar ? 'إعدادات المنشأة' : 'Business settings'}</a></p><button type="button" disabled={busy} onClick={refreshLogo}>{ar ? 'تحديث الشعار بعد إضافته' : 'Refresh after adding your logo'}</button></>}
    <label htmlFor="event-cover">{ar ? 'مطلوب · النسبة المقترحة 16:9 · حتى 10 MB' : 'Required · Recommended ratio 16:9 · Up to 10 MB'}</label>
    <input id="event-cover" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { choose(e.target.files?.[0]); e.target.value = ''; }} />
    {error && <p role="alert" style={{ color: '#a32222' }}>{error}</p>}
    {image ? <div style={{ display: 'grid', gap: 10 }}>
      <canvas ref={canvas} width={1600} height={900} style={{ width: '100%', maxWidth: 640, aspectRatio: '16/9', borderRadius: 12 }} aria-label={ar ? 'معاينة القص' : 'Crop preview'} />
      {['x', 'y', 'zoom'].map(axis => <label key={axis}>{axis === 'x' ? (ar ? 'أفقي' : 'Horizontal position') : axis === 'y' ? (ar ? 'عمودي' : 'Vertical position') : (ar ? 'تكبير' : 'Zoom')}<input type="range" min={axis === 'zoom' ? 1 : 0} max={axis === 'zoom' ? Math.max(1, Math.min(image.width / 960, image.height / 540)) : 100} step={axis === 'zoom' ? .05 : 1} value={position[axis]} onChange={e => setPosition(p => ({ ...p, [axis]: Number(e.target.value) }))} /></label>)}
      <button type="button" onClick={() => canvas.current.toBlob(blob => { if (blob) { setValue('coverImage', new File([blob], 'event-cover.webp', { type: 'image/webp' }), { shouldDirty: true, shouldValidate: true }); setImage(null); } }, 'image/webp', .92)}>{ar ? 'استخدام هذا الغلاف' : 'Use this cover'}</button>
      <button type="button" onClick={() => setImage(null)}>{ar ? 'إلغاء' : 'Cancel'}</button>
    </div> : preview && <img src={preview} alt={ar ? 'معاينة غلاف المناسبة' : 'Event cover preview'} style={{ width: '100%', maxWidth: 640, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 12 }} />}
  </section>;
}
