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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,600;1,700&display=swap&subset=cyrillic"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#EFEAFF] text-[#141218] antialiased">
        {children}
      </body>
    </html>
  );
}
