'use client';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import useAuthStore from '@/stores/authStore';
import { apiRequest } from '@/services/http';
import { API_PATHS } from '@halaa/shared/api/paths';
import Button from '@/ui/commen/button/Button';

export default function BusinessLogoNotice({ owner }) {
  const user = useAuthStore(s => s.user);
  const account = owner || user;
  const accountId = account?._id || account?.id;
  const otherOwner = Boolean(owner && accountId !== (user?._id || user?.id));
  const { lang } = useParams();
  const { t } = useTranslation('createEvent');
  const { setValue } = useFormContext();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshedLogo, setRefreshedLogo] = useState(null);
  const logo = refreshedLogo?.id === accountId ? refreshedLogo.avatar : account?.avatar;
  const isBusiness = account?.accountType === 'business';
  useEffect(() => {
    setValue('isBusinessEvent', isBusiness);
    setValue('businessLogoMissing', isBusiness && !logo);
  }, [isBusiness, logo, setValue]);
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
      setError(t('businessBranding.refreshError'));
    } finally {
      setBusy(false);
    }
  }
  if (!isBusiness || logo) return null;
  return <section aria-busy={busy}>
    <p role="alert">{t('businessBranding.logoRequired')}</p>
    <a href={otherOwner ? `/${lang}/admin-dash/businesses/${accountId}` : `/${lang}/host/settings`} target="_blank" rel="noopener noreferrer">{t('businessBranding.settings')}</a>
    <Button variant="secondary" title={t('businessBranding.refreshLogo')} disabled={busy} onClick={refreshLogo} />
    {error && <p role="alert">{error}</p>}
  </section>;
}
