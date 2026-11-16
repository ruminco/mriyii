import type { Metadata } from 'next';
import { Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['cyrillic', 'latin'],
  weight: ['500', '600', '700'],
  style: ['italic'],
  variable: '--font-serif-accent',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Mriyii — Розумні вішлісти зі зборами на Монобанку та ШІ-асистентом',
  description:
    'Створюйте списки бажань зі збереженням інтриги, спільними зборами на Банку Monobank та персональним ШІ-порадником подарунків.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={cormorantGaramond.variable}>
      <body className="min-h-screen bg-[#EFEAFF] text-[#141218] antialiased">
        {children}
      </body>
    </html>
  );
}
