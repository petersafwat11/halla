'use client';
import React from 'react';

export default function BillingTypeToggle({ billingType, onChange, t }) {
  const types = [
    { key: 'event', label: t('billingTypes.event') },
    { key: 'monthly', label: t('billingTypes.monthly') },
  ];

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      {types.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            border: `2px solid ${billingType === key ? '#C28E5C' : '#E5E7EA'}`,
            background: billingType === key ? '#C28E5C' : '#FFF',
            color: billingType === key ? '#FFF' : '#333',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
