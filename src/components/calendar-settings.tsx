'use client';

import { useState } from 'react';
import { Clipboard, Check } from 'lucide-react';

interface CalendarSettingsProps {
  subscriptionToken?: string;
  baseUrl: string;
}

export function CalendarSettings({ subscriptionToken, baseUrl }: CalendarSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState(subscriptionToken);
  const [icalUrl, setIcalUrl] = useState(subscriptionToken ? `${baseUrl}/api/calendars/ical/${subscriptionToken}` : '');

  async function generateSubscriptionUrl() {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/calendars/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'No pudimos generar la URL');
      }

      const data = await response.json();
      setToken(data.subscription_token);
      setIcalUrl(data.ical_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }

  function copyToClipboard() {
    if (!icalUrl) return;
    navigator.clipboard.writeText(icalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
      {/* Encabezado */}
      <div>
        <h3 className="text-base font-semibold text-[var(--alma-text)]">Calendario por enlace</h3>
        <p className="mt-1 text-sm text-[var(--alma-text-muted)]">
          Compartí este enlace con Apple Calendar, Google Calendar u Outlook. Google actualiza las suscripciones según sus propios tiempos.
        </p>
      </div>

      {/* Instrucciones iniciales */}
      {!token ? (
        <div className="space-y-4">
          <div className="rounded bg-[var(--alma-action-soft)] p-3 text-sm text-[var(--alma-text)]">
            <p>
              <strong>¿Cómo funciona?</strong>
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
              <li>Generamos una URL única con tus turnos</li>
              <li>Agregala en tu calendario como suscripción</li>
              <li>Los turnos se actualizan cuando ese calendario vuelve a consultar el enlace</li>
            </ul>
          </div>

          <button
            onClick={generateSubscriptionUrl}
            disabled={isLoading}
            className="w-full rounded-md bg-[var(--alma-action)] px-4 py-3 text-sm font-semibold text-[var(--alma-on-action)] disabled:opacity-40"
          >
            {isLoading ? 'Generando…' : 'Generar enlace'}
          </button>

          {error && <div role="alert" className="text-sm text-[var(--error-600)]">{error}</div>}
        </div>
      ) : (
        <div className="space-y-4">
          {/* URL generada */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--alma-text-muted)]">
              URL de tu calendario
            </label>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                readOnly
                value={icalUrl}
                className="flex-1 truncate rounded border border-[var(--alma-border)] bg-[var(--alma-bg)] px-3 py-2 text-sm text-[var(--alma-text)]"
              />
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 rounded border border-[var(--alma-action)] bg-[var(--alma-bg)] px-3 py-2 text-sm font-medium text-[var(--alma-action)]"
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
          <div className="rounded bg-[var(--info-soft)] p-3 text-sm">
            <p className="font-medium text-[var(--alma-text)]">Para Apple Calendar:</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-[var(--alma-text-muted)]">
              <li>Abrí la app Calendario</li>
              <li>Elegí agregar un calendario por suscripción</li>
              <li>Pegá la URL que copiaste arriba</li>
            </ol>
          </div>

          {/* Instrucciones genéricas */}
          <div className="rounded bg-[var(--alma-surface-2)] p-3 text-sm">
            <p className="font-medium text-[var(--alma-text)]">Para otros calendarios:</p>
            <p className="mt-1 text-xs text-[var(--alma-text-muted)]">
              Podés usar esta URL en Google Calendar, Outlook y cualquier app que acepte iCal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
