import { Suspense } from 'react';
import { Providers } from './providers.jsx';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export default async function LangLayout({ children, params }) {
  const resolvedParams = await params;
  const lang = resolvedParams?.lang === 'ar' ? 'ar' : 'en';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dir = "${dir}"; document.documentElement.lang = "${lang}";`,
        }}
      />
      <div
        id="app-lang-root"
        lang={lang}
        dir={dir}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-artboard, #f9f4ef)',
          color: 'var(--color-natural-900, #2c2c2c)',
        }}
      >
        <Suspense fallback={null}>
          <Providers>
            {children}
          </Providers>
        </Suspense>
      </div>
    </>
  );
}
