import type { SupabaseClient } from '@supabase/supabase-js';
import { addDias, diasEntre, hoyISO } from '@/lib/fecha';

export type PacienteCumpleanos = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  fecha_nacimiento: string;
};

export type Cumpleanos = PacienteCumpleanos & {
  fecha: string;
  edad: number;
  dias: number;
};

function bisiesto(anio: number): boolean {
  return anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0);
}

function aniversario(nacimiento: string, anio: number): string {
  const mesDia = nacimiento.slice(5);
  return `${anio}-${mesDia === '02-29' && !bisiesto(anio) ? '02-28' : mesDia}`;
}

export function proximosCumpleanos(
  pacientes: PacienteCumpleanos[],
  hoy: string,
  horizonteDias = 30,
): Cumpleanos[] {
  const anio = Number(hoy.slice(0, 4));
  return pacientes.flatMap((p) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fecha_nacimiento)) return [];
    let fecha = aniversario(p.fecha_nacimiento, anio);
    if (fecha < hoy) fecha = aniversario(p.fecha_nacimiento, anio + 1);
    const dias = diasEntre(hoy, fecha);
    if (dias > horizonteDias || fecha > addDias(hoy, horizonteDias)) return [];
    return [{ ...p, fecha, edad: Number(fecha.slice(0, 4)) - Number(p.fecha_nacimiento.slice(0, 4)), dias }];
  }).sort((a, b) => a.dias - b.dias || a.nombre.localeCompare(b.nombre, 'es'));
}

export async function cargarCumpleanos(
  supabase: SupabaseClient,
  tenantId: string,
  timezone: string,
  horizonteDias = 30,
): Promise<Cumpleanos[]> {
  const pacientes: PacienteCumpleanos[] = [];
  for (let desde = 0; ; desde += 500) {
    const { data, error } = await supabase
      .from('alma_patients')
      .select('id, nombre, apellido, telefono, fecha_nacimiento')
      .eq('tenant_id', tenantId)
      .eq('archivado', false)
      .not('fecha_nacimiento', 'is', null)
      .order('id')
      .range(desde, desde + 499);
    if (error) throw error;
    const lote: PacienteCumpleanos[] = (data ?? []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido ?? '',
      telefono: p.telefono ?? '',
      fecha_nacimiento: p.fecha_nacimiento,
    }));
    pacientes.push(...lote);
    if (lote.length < 500) break;
  }
  return proximosCumpleanos(pacientes, hoyISO(timezone), horizonteDias);
}
