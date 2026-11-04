import { z } from 'zod';

/** Importes de consultas en pesos enteros, sin redondeo implícito. */
export const montoConsultaSchema = z.coerce.number()
  .int('El precio tiene que ser un número entero.')
  .nonnegative('El precio no puede ser negativo.');
