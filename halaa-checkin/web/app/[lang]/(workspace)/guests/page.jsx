'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useSession } from '../../../../hooks/useSession.jsx';
import { GuestsWorkspace } from '../../../../components/guests/GuestsWorkspace.jsx';

export default function GuestsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = params?.lang === 'en' ? 'en' : 'ar';
  const router = useRouter();

  const { role, isLoading } = useSession();

  // Role guard: Receptionists are redirected to Gate workspace
  useEffect(() => {
    if (!isLoading && role === 'reception') {
      const eventId = searchParams?.get('eventId');
      const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
      router.replace(`/${lang}/gate${query}`);
    }
  }, [isLoading, role, lang, router, searchParams]);

  if (role === 'reception') {
    return null; // Redirecting
  }

  return <GuestsWorkspace lang={lang} />;
}
