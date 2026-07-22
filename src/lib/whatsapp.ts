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

/** Link wa.me sin destinatario: abre WhatsApp para elegir a quién compartirle el mensaje. */
export function waShareLink(mensaje: string): string {
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
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

export const PLANTILLA_CANCELACION_DEFAULT =
  'Hola {nombre}! Te escribo porque tengo que cancelar tu turno del {fecha} a las {hora}. Contestame por acá y lo reprogramamos. ¡Perdón por las molestias!';

/**
 * Rinde la plantilla de cancelación reemplazando {nombre}, {fecha} y {hora}.
 * Si la plantilla está vacía, usa la de fábrica.
 */
export function mensajeCancelacion(
  plantilla: string,
  datos: { nombre: string; apellido: string; fecha: string; hora: string },
): string {
  const base = plantilla.trim() || PLANTILLA_CANCELACION_DEFAULT;
  return base
    .replaceAll('{nombre}', datos.nombre)
    .replaceAll('{apellido}', datos.apellido)
    .replaceAll('{fecha}', datos.fecha)
    .replaceAll('{hora}', datos.hora);
}

/** Mensaje para retomar contacto con un paciente que hace tiempo no viene. */
export function mensajeReencuentro(nombre: string): string {
  return `Hola ${nombre}! ¿Cómo andás? Hace un tiempo que no nos vemos. Si querés, coordinamos un turno. ¡Saludos!`;
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
