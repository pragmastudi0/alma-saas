/** Isotipo de alma: flor de 4 pétalos. Único gesto gráfico permitido. */
export function Flor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <ellipse cx="12" cy="5.5" rx="3" ry="4.6" />
      <ellipse cx="12" cy="18.5" rx="3" ry="4.6" />
      <ellipse cx="5.5" cy="12" rx="4.6" ry="3" />
      <ellipse cx="18.5" cy="12" rx="4.6" ry="3" />
    </svg>
  );
}
