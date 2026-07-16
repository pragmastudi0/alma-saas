/** Slug público del profesional para /t/[slug]. Mismo formato que el check de la DB. */

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/** Sugerencia de slug a partir del nombre: "María López" → "maria-lopez". */
export function slugificar(nombre: string): string {
  const s = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // saca tildes (diacríticos combinantes tras NFD)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return SLUG_RE.test(s) ? s : '';
}
