import Link from 'next/link';
import Image from 'next/image';
import HealthProbe from './HealthProbe';

export default async function LangPage({ params }) {
  const resolvedParams = await params;
  const lang = resolvedParams?.lang === 'ar' ? 'ar' : 'en';
  const isAr = lang === 'ar';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-artboard, #f9f4ef)',
        color: 'var(--color-natural-900, #2c2c2c)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Halaa Header */}
      <header
        style={{
          height: '72px',
          backgroundColor: 'var(--color-natural-50, #ffffff)',
          borderBottom: '1px solid var(--border-gray-200, #f2f2f2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(16px, 4vw, 48px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Image
            src="/images/logo.png"
            alt="Halaa Logo"
            width={36}
            height={36}
            priority
            style={{ height: '36px', width: '36px', objectFit: 'contain' }}
          />
          <span
            style={{
              height: '24px',
              width: '1px',
              backgroundColor: 'var(--border-gray-250, #dfdfdf)',
            }}
          />
          <h1
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--color-natural-900, #2c2c2c)',
            }}
          >
            {isAr ? 'إدارة دخول الضيوف' : 'Guest Check-in'}
          </h1>
        </div>

        <div>
          <Link
            href={isAr ? '/en' : '/ar'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '40px',
              padding: '0 16px',
              borderRadius: '12px',
              border: '1px solid var(--border-gray-250, #dfdfdf)',
              backgroundColor: 'var(--color-natural-50, #ffffff)',
              color: 'var(--color-natural-900, #2c2c2c)',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
          >
            {isAr ? 'English' : 'العربية'}
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          maxWidth: '960px',
          width: '100%',
          margin: '0 auto',
          padding: '40px 24px',
        }}
      >
        {/* Workspace Card */}
        <section
          style={{
            backgroundColor: 'var(--color-natural-50, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--border-gray-250, #dfdfdf)',
            padding: '36px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: 'var(--color-primary-100, #f5ece4)',
              color: 'var(--color-primary-800, #6b4e33)',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '16px',
            }}
          >
            {isAr ? 'المرحلة T00 — تهيئة بيئة العمل والهوية البصرية' : 'Task T00 — Workspace & Design Runtime'}
          </div>

          <h2
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: 'var(--color-natural-900, #2c2c2c)',
              marginBottom: '12px',
              lineHeight: '1.3',
            }}
          >
            {isAr ? 'نظام هلا لإدارة دخول الضيوف' : 'Halaa Guest Check-in System'}
          </h2>

          <p
            style={{
              fontSize: '16px',
              color: 'var(--color-natural-450, #656565)',
              lineHeight: '1.6',
              marginBottom: '28px',
            }}
          >
            {isAr
              ? 'تطبيق مستقل لإدارة قوائم الضيوف، وإصدار بطاقات الدخول الذكية برمز الاستجابة السريعة (QR)، وتأكيد الدخول المباشر عند البوابات.'
              : 'Standalone guest list management, QR invitation pass distribution, and live gate admission verification system.'}
          </p>

          {/* Action Button Examples */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <button
              type="button"
              style={{
                height: '48px',
                padding: '0 24px',
                backgroundColor: 'var(--btn-primary-bg, #c28e5c)',
                color: 'var(--btn-primary-fg, #ffffff)',
                borderRadius: '12px',
                border: 'none',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {isAr ? 'الإجراء الرئيسي (Primary)' : 'Primary Action'}
            </button>
            <button
              type="button"
              style={{
                height: '48px',
                padding: '0 24px',
                backgroundColor: 'var(--btn-secondary-bg, #f5ece4)',
                color: 'var(--btn-secondary-fg, #6b4e33)',
                borderRadius: '12px',
                border: '1px solid var(--color-primary-200, #e3cbb4)',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {isAr ? 'الإجراء الثانوي (Secondary)' : 'Secondary Action'}
            </button>
          </div>

          {/* Health probe to verify same-origin Express dev proxy */}
          <HealthProbe lang={lang} />
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '24px',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--color-natural-450, #656565)',
          borderTop: '1px solid var(--border-gray-200, #f2f2f2)',
          backgroundColor: 'var(--color-natural-50, #ffffff)',
        }}
      >
        <span>
          {isAr
            ? '© هلا لحلول الفعاليات — خط كايرو المحلي | ألوان هلا المعتمدة'
            : '© Halaa Event Solutions — Local Cairo Typography | Authoritative Tokens'}
        </span>
      </footer>
    </div>
  );
}
