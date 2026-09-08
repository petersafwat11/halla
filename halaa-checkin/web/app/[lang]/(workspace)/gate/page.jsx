'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { GateWorkspace } from '../../../../components/gate/GateWorkspace.jsx';

export default function GatePage() {
  const params = useParams();
  const lang = params?.lang === 'en' ? 'en' : 'ar';

  return <GateWorkspace lang={lang} />;
}
