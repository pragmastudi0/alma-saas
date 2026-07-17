import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Imagen de vista previa al compartir el link de alma (WhatsApp, Instagram, X…).
// Tarjeta de marca: fondo verde base, la flor, "alma" en Instrument Serif itálica.
export const alt = 'alma — tu consultorio, en orden';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Tokens de marca (src/styles/alma-tokens.css) — sin valores mágicos sueltos.
const VERDE_600 = '#0E5F4C'; // base de marca
const VERDE_700 = '#0A4A3B'; // bosque
const VERDE_200 = '#B9DBCE';
const VERDE_100 = '#DCEDE6';
const PAPEL = '#FFFFFF';

// Isotipo de alma (flor de 4 pétalos) como SVG embebido, en tono verde suave.
const florDataUri = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${VERDE_200}">
    <ellipse cx="12" cy="5.5" rx="3" ry="4.6"/>
    <ellipse cx="12" cy="18.5" rx="3" ry="4.6"/>
    <ellipse cx="5.5" cy="12" rx="4.6" ry="3"/>
    <ellipse cx="18.5" cy="12" rx="4.6" ry="3"/>
  </svg>`,
).toString('base64')}`;

export default async function OpengraphImage() {
  const fontsDir = join(process.cwd(), 'src/app/_og-fonts');
  const [serifItalic, inter] = await Promise.all([
    readFile(join(fontsDir, 'InstrumentSerif-Italic.ttf')),
    readFile(join(fontsDir, 'Inter-Regular.ttf')),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '96px',
          backgroundColor: VERDE_600,
          backgroundImage: `linear-gradient(135deg, ${VERDE_600} 0%, ${VERDE_700} 100%)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={florDataUri} width={96} height={96} alt="" />
        <div
          style={{
            fontFamily: 'Instrument Serif',
            fontStyle: 'italic',
            fontSize: 150,
            lineHeight: 1,
            color: PAPEL,
            marginTop: 40,
          }}
        >
          alma
        </div>
        <div
          style={{
            fontFamily: 'Instrument Serif',
            fontStyle: 'italic',
            fontSize: 64,
            lineHeight: 1.1,
            color: VERDE_200,
            marginTop: 8,
          }}
        >
          Tu consultorio, en orden.
        </div>
        <div
          style={{
            fontFamily: 'Inter',
            fontSize: 32,
            lineHeight: 1.4,
            color: VERDE_100,
            marginTop: 32,
            maxWidth: 760,
          }}
        >
          La secretaria virtual del profesional independiente.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Instrument Serif', data: serifItalic, style: 'italic', weight: 400 },
        { name: 'Inter', data: inter, style: 'normal', weight: 400 },
      ],
    },
  );
}
