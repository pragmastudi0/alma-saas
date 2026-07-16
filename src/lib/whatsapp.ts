/**
 * WhatsApp semi-automático vía wa.me (sin API, sin credenciales).
 * El profesional abre WhatsApp con el mensaje ya escrito y envía a mano.
 */

/**
 * Normaliza un teléfono argentino a dígitos con código país + móvil (549…).
 * Best-effort: el input es texto libre. Devuelve null si no hay dígitos.
 */
export function normalizarTelAR(telefono: string): string | null {
  let d = telefono.replace(/\D/g, '');
  if (!d) return null;
  // Ya viene en formato internacional.
  if (d.startsWith('54')) return d;
  // Sacamos el 0 de larga distancia y el 15 de celular si quedaron al inicio.
  d = d.replace(/^0/, '').replace(/^15/, '');
  return `549${d}`;
}

/** Arma el link wa.me con el mensaje prellenado. null si el teléfono no sirve. */
export function waLink(telefono: string, mensaje: string): string | null {
  const tel = normalizarTelAR(telefono);
  if (!tel) return null;
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
}

export function mensajeRecordatorio(nombre: string, fecha: string, hora: string): string {
  return `Hola ${nombre}! Te recuerdo tu turno del ${fecha} a las ${hora}. ¡Nos vemos!`;
}

export function mensajeSena(nombre: string, fecha: string, hora: string, link: string): string {
  return `Hola ${nombre}! Para reservar tu turno del ${fecha} a las ${hora}, dejá la seña acá: ${link}`;
}

/** Pedido de seña por transferencia (fallback cuando no hay Mercado Pago conectado). */
export function mensajeSenaAlias(
  nombre: string,
  fecha: string,
  hora: string,
  monto: string,
  alias: string,
): string {
  return `Hola ${nombre}! Para reservar tu turno del ${fecha} a las ${hora}, transferí la seña (${monto}) al alias ${alias} y avisame por acá. ¡Gracias!`;
}
