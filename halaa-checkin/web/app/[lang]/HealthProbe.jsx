'use client';

import { useEffect, useState } from 'react';

export default function HealthProbe({ lang }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAr = lang === 'ar';

  useEffect(() => {
    let active = true;

    async function checkHealth() {
      try {
        setLoading(true);
        // Call via Next.js same-origin dev proxy
        const res = await fetch('/api/checkin/v1/health');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        if (active) {
          setHealth(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    checkHealth();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      style={{
        marginTop: '24px',
        padding: '20px',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        border: '1px solid var(--form-border, #dfdfdf)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <span style={{ fontWeight: '600', fontSize: '16px', color: 'var(--color-natural-900, #2c2c2c)' }}>
          {isAr ? 'فحص اتصال الخادم (Same-Origin Liveness)' : 'Backend Connection Probe (Same-Origin)'}
        </span>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor: loading
              ? 'var(--status-neutral-bg, #f2f2f2)'
              : error
              ? 'var(--status-danger-bg, #f9ebea)'
              : 'var(--status-success-bg, #eaf4ef)',
            color: loading
              ? 'var(--status-neutral-fg, #656565)'
              : error
              ? 'var(--status-danger-fg, #c0392b)'
              : 'var(--status-success-fg, #2a8c5b)',
          }}
        >
          {loading
            ? isAr
              ? 'جارِ الاتصال...'
              : 'Connecting...'
            : error
            ? isAr
              ? 'تعذر الاتصال'
              : 'Disconnected'
            : isAr
            ? 'متصل بنجاح'
            : 'Operational'}
        </span>
      </div>

      <div style={{ fontSize: '14px', color: 'var(--color-natural-450, #656565)', lineHeight: '1.6' }}>
        <p>
          <strong style={{ color: 'var(--color-natural-900, #2c2c2c)' }}>Endpoint:</strong>{' '}
          <code
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: '#f2f2f2',
              fontSize: '13px',
              fontFamily: 'monospace',
            }}
          >
            /api/checkin/v1/health
          </code>
        </p>
        {health && (
          <div style={{ marginTop: '8px' }}>
            <p>
              <strong style={{ color: 'var(--color-natural-900, #2c2c2c)' }}>Service:</strong> {health.service}
            </p>
            <p>
              <strong style={{ color: 'var(--color-natural-900, #2c2c2c)' }}>Uptime:</strong> {health.uptimeSeconds}s
            </p>
            <p>
              <strong style={{ color: 'var(--color-natural-900, #2c2c2c)' }}>Server Time:</strong> {health.timestamp}
            </p>
          </div>
        )}
        {error && (
          <p style={{ color: 'var(--color-error-500, #c0392b)', marginTop: '8px' }}>
            {isAr ? 'خطأ في الاتصال: ' : 'Connection error: '}
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
