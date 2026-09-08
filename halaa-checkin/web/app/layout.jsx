import './globals.css';
import localFont from 'next/font/local';

const cairo = localFont({
  src: [
    {
      path: '../public/fonts/Cairo_400Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Cairo_500Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/Cairo_600SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/Cairo_700Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata = {
  title: 'Halaa Guest Check-in | هلا لإدارة دخول الضيوف',
  description: 'Halaa guest list management, QR passes, and gate reception system',
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: '#c28e5c',
  colorScheme: 'light',
};

export default function RootLayout({ children }) {
  return (
    <html className={cairo.variable}>
      <body className={cairo.className}>
        {children}
      </body>
    </html>
  );
}
