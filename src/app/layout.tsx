import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
});

// URL pública del sitio: hace que la imagen de compartir sea una URL absoluta
// (WhatsApp, Instagram y demás no leen imágenes con ruta relativa).
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'alma — tu consultorio, en orden',
  description: 'La secretaria virtual del profesional independiente.',
  appleWebApp: {
    capable: true,
    title: 'alma',
    statusBarStyle: 'default',
  },
  openGraph: {
    type: 'website',
    siteName: 'alma',
    locale: 'es_AR',
    url: '/',
    title: 'alma — tu consultorio, en orden',
    description:
      'La secretaria virtual que se encarga de los turnos, las señas y los recordatorios. Vos atendé; del resto nos ocupamos.',
    // La imagen la aporta automáticamente src/app/opengraph-image.tsx.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'alma — tu consultorio, en orden',
    description:
      'La secretaria virtual que se encarga de los turnos, las señas y los recordatorios. Vos atendé; del resto nos ocupamos.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0E5F4C',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
