import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Budget camp scout',
  description: 'Gestion mobile-first du budget d’un camp scout',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
