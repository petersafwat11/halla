import React, { useEffect, useState } from 'react';
import { View, Linking, Modal } from 'react-native';
import { useFormContext } from 'react-hook-form';
import { WEB_BASE_URL } from '../../config/api';
import { API_PATHS } from '@halaa/shared/api/paths';
import { apiFetch } from '../../services/http';
import { useAuthStore } from '../../stores/authStore';
import { useTranslation } from '../../localization';
import { LocalizedText } from '../commen';
import { TouchableOpacity } from 'react-native';
import { spacing, colors } from '../../styles/tokens';

export default function BusinessLogoNotice({ owner }) {
  const user = useAuthStore(s => s.user);
  const account = owner || user;
  const accountId = account?._id || account?.id;
  const otherOwner = Boolean(owner && accountId !== (user?._id || user?.id));
  const { t, currentLanguage } = useTranslation('createEvent');
  const { setValue, watch } = useFormContext();
  const requested = watch('businessLogoCheckRequested');
  const dismiss = () => setValue('businessLogoCheckRequested', false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refreshedLogo, setRefreshedLogo] = useState(null);
  const logo = refreshedLogo?.id === accountId ? refreshedLogo.avatar : account?.avatar;
  const business = account?.accountType === 'business';
  useEffect(() => {
    setValue('isBusinessEvent', business);
    setValue('businessLogoMissing', business && !logo);
  }, [business, logo, setValue]);
  useEffect(() => {
    if (logo && requested) setValue('businessLogoCheckRequested', false);
  }, [logo, requested, setValue]);
  async function refreshLogo() {
    setBusy(true);
    setError('');
    try {
      const result = await apiFetch(
        otherOwner
          ? API_PATHS.admin.businesses.getById(accountId)
          : API_PATHS.users.getMyProfile,
      );
      if (!result.ok) throw new Error();
      const payload = await result.json();
      const fresh = payload.data?.business || payload.data?.user;
      if (fresh)
        setRefreshedLogo({
          id: account._id || account.id,
          avatar: fresh.avatar || fresh.avatarUrl,
        });
    } catch (_) {
      setError(t('businessBranding.refreshError'));
    } finally {
      setBusy(false);
    }
  }
  if (!business || logo) return null;
  const action = (label, onPress) => <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={onPress} style={{ minHeight: 48, padding: spacing[12], backgroundColor: colors.primary[100], borderRadius: 12 }}><LocalizedText>{label}</LocalizedText></TouchableOpacity>;
  return <Modal visible={!!requested} transparent animationType="fade" onRequestClose={dismiss}>
    <View style={{ flex: 1, justifyContent: 'center', padding: spacing[24], backgroundColor: 'rgba(0,0,0,0.45)' }}>
    <View accessibilityViewIsModal style={{ gap: spacing[12], padding: spacing[24], backgroundColor: colors.natural[50], borderRadius: 16 }}>
    <LocalizedText>{t('businessBranding.logoRequired')}</LocalizedText>
    {action(t('businessBranding.settings'), () => Linking.openURL(`${WEB_BASE_URL}/${currentLanguage === 'ar' ? 'ar' : 'en'}/${otherOwner ? `admin-dash/businesses/${accountId}` : 'host/settings'}`).catch(() => setError(t('businessBranding.refreshError'))))}
    {action(t('businessBranding.refreshLogo'), refreshLogo)}
    {action(t('businessBranding.close'), dismiss)}
    {!!error && <LocalizedText>{error}</LocalizedText>}
  </View></View></Modal>;
}
