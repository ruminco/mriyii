import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="uk">
      <body className="min-h-screen bg-amber-50/30 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
