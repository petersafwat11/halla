'use client';
import React from 'react';

export default function PlanFamilySelector({ planFamily, onChange, t }) {
  const families = [
    { key: 'basic', label: t('planFamilies.basic') },
    { key: 'premium', label: t('planFamilies.premium') },
  ];

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      {families.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            padding: '10px 24px',
            borderRadius: '24px',
            border: `2px solid ${planFamily === key ? '#C28E5C' : '#E5E7EA'}`,
            background: planFamily === key ? '#C28E5C' : '#FFF',
            color: planFamily === key ? '#FFF' : '#333',
            cursor: 'pointer',
            fontWeight: planFamily === key ? '600' : '400',
            transition: 'all 0.2s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
