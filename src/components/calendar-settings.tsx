'use client';

import { useState } from 'react';
import { Clipboard, Check } from 'lucide-react';

interface CalendarSettingsProps {
  subscriptionToken?: string;
  baseUrl?: string;
}

export function CalendarSettings({ subscriptionToken, baseUrl = 'https://alma-app.com' }: CalendarSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState(subscriptionToken);

  async function generateSubscriptionUrl() {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/calendars/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('No pudimos generar la URL');

      const data = await response.json();
      setToken(data.subscription_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }

  const icalUrl = token ? `${baseUrl}/api/calendars/ical/${token}` : '';

  function copyToClipboard() {
    if (!icalUrl) return;
    navigator.clipboard.writeText(icalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      {/* Encabezado */}
      <div>
        <h3 className="text-base font-semibold text-neutral-900">Sincronizar con Calendario</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Tus turnos aparecerán automáticamente en Apple Calendar, Google Calendar, Outlook, etc.
        </p>
      </div>

      {/* Instrucciones iniciales */}
      {!token ? (
        <div className="space-y-4">
          <div className="rounded bg-green-50 p-3 text-sm text-green-900">
            <p>
              <strong>¿Cómo funciona?</strong>
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
              <li>Generamos una URL única con tus turnos</li>
              <li>La agregas a tu Apple Calendar como "Suscripción"</li>
              <li>Los turnos se sincronizan automáticamente</li>
            </ul>
          </div>

          <button
            onClick={generateSubscriptionUrl}
            disabled={isLoading}
            className="w-full rounded-md bg-verde-600 px-4 py-2 text-sm font-medium text-white hover:bg-verde-700 disabled:opacity-50"
          >
            {isLoading ? 'Generando...' : 'Agregar a Calendario'}
          </button>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      ) : (
        <div className="space-y-4">
          {/* URL generada */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
              URL de tu calendario
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                readOnly
                value={icalUrl}
                className="flex-1 truncate rounded border border-neutral-200 bg-white px-3 py-2 text-sm font-mono text-neutral-700"
              />
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 rounded border border-verde-600 bg-white px-3 py-2 text-sm font-medium text-verde-600 hover:bg-verde-50"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiada
                  </>
                ) : (
                  <>
                    <Clipboard className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Instrucciones para Apple Calendar */}
          <div className="rounded bg-blue-50 p-3 text-sm">
            <p className="font-medium text-blue-900">Para Apple Calendar (iPhone/iPad):</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-blue-800">
              <li>Abre la app Calendario</li>
              <li>Abajo a la derecha, toca el ícono "+"</li>
              <li>Selecciona "Suscribirse a calendario"</li>
              <li>Pega la URL que copiaste arriba</li>
              <li>Listo: tus turnos aparecerán automáticamente</li>
            </ol>
          </div>

          {/* Instrucciones genéricas */}
          <div className="rounded bg-neutral-100 p-3 text-sm">
            <p className="font-medium text-neutral-900">Para otros calendarios:</p>
            <p className="mt-1 text-xs text-neutral-700">
              Puedes usar esta URL en Google Calendar, Outlook, Thunderbird, y cualquier app que soporte iCal/CalDAV.
            </p>
          </div>

          {/* Regenerar token */}
          <button
            onClick={generateSubscriptionUrl}
            disabled={isLoading}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            ↻ Regenerar URL (la anterior dejará de funcionar)
          </button>
        </div>
      )}
    </div>
  );
}
