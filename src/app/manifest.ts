import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'alma — tu consultorio, en orden',
    short_name: 'alma',
    description: 'La secretaria virtual del profesional independiente.',
    start_url: '/hoy',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#0E5F4C',
    lang: 'es-AR',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
