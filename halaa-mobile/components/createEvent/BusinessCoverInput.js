import { WEB_BASE_URL } from "../../config/api";
import { API_PATHS } from '@halaa/shared/api/paths';
import { apiFetch } from '../../services/http';
import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useFormContext } from 'react-hook-form';
import { useAuthStore } from '../../stores/authStore';
import { useTranslation } from '../../localization';

export default function BusinessCoverInput({ owner }) {
  const user = useAuthStore(s => s.user);
  const account = owner || user;
  const { currentLanguage } = useTranslation('createEvent');
  const ar = currentLanguage === 'ar';
  const { setValue, watch } = useFormContext();
  const [asset, setAsset] = useState(null);
  const [crop, setCrop] = useState({ x: .5, y: .5 });
  const [width, setWidth] = useState(300);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshedLogo, setRefreshedLogo] = useState(null);
  const logo = refreshedLogo?.id === (account?._id || account?.id) ? refreshedLogo.avatar : account?.avatar;
  const cover = watch('coverImage');
  const business = account?.accountType === 'business';
  useEffect(() => {
    setValue('isBusinessEvent', business);
    setValue('businessLogoMissing', business && !logo);
  }, [business, logo, setValue]);
  async function refreshLogo() {
    setBusy(true);
    try {
      const otherOwner = owner?._id && owner._id !== user?._id;
      const result = await apiFetch(otherOwner ? API_PATHS.admin.businesses.getById(owner._id) : API_PATHS.users.getMyProfile);
      if (!result.ok) throw new Error();
      const payload = await result.json();
      const fresh = payload.data?.business || payload.data?.user;
      if (fresh) setRefreshedLogo({ id: account._id || account.id, avatar: fresh.avatar || fresh.avatarUrl });
    } catch (_) { setError(ar ? 'تعذر تحديث الشعار. حاول مجددًا.' : 'Could not refresh the logo. Try again.'); }
    finally { setBusy(false); }
  }
  async function choose() {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError(ar ? 'اسمح بالوصول إلى الصور لاختيار الغلاف.' : 'Allow photo access to choose a cover.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false });
    if (result.canceled) return;
    const file = result.assets[0];
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimeType) || file.fileSize > 10 * 1024 * 1024 || file.width < 960 || file.height < 540 || file.width > 8192 || file.height > 8192 || file.width * file.height > 40000000) {
      setError(ar ? 'اختر JPEG أو PNG أو WebP حتى 10 MB، من 960 × 540 إلى 8192 بكسل وبحد أقصى 40 ميجابكسل.' : 'Use JPEG, PNG or WebP up to 10 MB, at least 960 × 540, at most 8192 pixels per side and 40 megapixels.'); return;
    }
    setAsset(file); setCrop({ x: .5, y: .5 });
  }
  async function apply() {
    setBusy(true);
    try {
      const w = Math.floor(Math.min(asset.width, asset.height * 16 / 9));
      const h = Math.floor(w * 9 / 16);
      const result = await ImageManipulator.manipulateAsync(asset.uri, [{ crop: { originX: Math.floor((asset.width - w) * crop.x), originY: Math.floor((asset.height - h) * crop.y), width: w, height: h } }], { compress: .95, format: ImageManipulator.SaveFormat.JPEG });
      setValue('coverImage', { uri: result.uri, name: 'event-cover.jpg', type: 'image/jpeg' }, { shouldDirty: true, shouldValidate: true }); setAsset(null);
    } catch (_) { setError(ar ? 'تعذر قص الصورة. حاول مجددًا.' : 'Could not crop this image. Try again.'); }
    finally { setBusy(false); }
  }
  const button = (label, onPress) => <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={onPress} style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#8c9aa6', minHeight: 44 }}><Text style={{ color: '#243747', textAlign: 'center' }}>{label}</Text></TouchableOpacity>;
  if (!business) return null;
  const scale = asset ? Math.max(width / asset.width, width * 9 / 16 / asset.height) : 1;
  return <View style={{ gap: 12, marginVertical: 24 }} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    <Text style={{ fontSize: 19, fontWeight: '600' }}>{ar ? 'غلاف المناسبة — مطلوب' : 'Event cover — required'}</Text>
    <Text>{ar ? 'النسبة المقترحة 16:9 · حتى 10 MB' : 'Recommended ratio 16:9 · Up to 10 MB'}</Text>
    {!logo && <><Text>{ar ? 'أضف شعار المنشأة قبل إنشاء المناسبة.' : 'Add a business logo before creating this event.'}</Text>{button(ar ? 'إعدادات المنشأة' : 'Business settings', () => Linking.openURL(`${WEB_BASE_URL}/${ar ? 'ar' : 'en'}/${owner?._id && owner._id !== user?._id ? `admin-dash/businesses/${owner._id}` : 'host/settings'}`))}{button(ar ? 'تحديث الشعار بعد إضافته' : 'Refresh after adding your logo', refreshLogo)}</>}
    {button(ar ? 'اختر صورة الغلاف' : 'Choose cover image', choose)}
    {!!error && <Text accessibilityRole="alert" style={{ color: '#a32222' }}>{error}</Text>}
    {asset ? <><View style={{ width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', borderRadius: 12 }}><Image source={{ uri: asset.uri }} style={{ width: asset.width * scale, height: asset.height * scale, position: 'absolute', left: -(asset.width * scale - width) * crop.x, top: -(asset.height * scale - width * 9 / 16) * crop.y }} /></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{button(ar ? 'يسار' : 'Left', () => setCrop(c => ({ ...c, x: Math.max(0, c.x - .1) })))}{button(ar ? 'يمين' : 'Right', () => setCrop(c => ({ ...c, x: Math.min(1, c.x + .1) })))}{button(ar ? 'أعلى' : 'Up', () => setCrop(c => ({ ...c, y: Math.max(0, c.y - .1) })))}{button(ar ? 'أسفل' : 'Down', () => setCrop(c => ({ ...c, y: Math.min(1, c.y + .1) })))}</View>
      {button(ar ? 'استخدام هذا الغلاف' : 'Use this cover', apply)}{button(ar ? 'إلغاء' : 'Cancel', () => setAsset(null))}</> : cover?.uri && <Image source={{ uri: cover.uri }} accessibilityLabel={ar ? 'معاينة الغلاف' : 'Cover preview'} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12 }} />}
  </View>;
}
