/**
 * Cifrado simétrico para secretos que persisten en la base (tokens de MP).
 * AES-256-GCM con clave de 32 bytes en MP_TOKEN_ENC_KEY (base64). Solo server.
 * Formato del payload: base64( iv[12] · authTag[16] · ciphertext ).
 */
import crypto from 'node:crypto';

function clave(variable = 'MP_TOKEN_ENC_KEY'): Buffer {
  const b64 = process.env[variable];
  if (!b64) {
    throw new Error(`Falta ${variable} en el entorno del server.`);
  }
  const key = Buffer.from(b64, 'base64');
  if (key.length !== 32) {
    throw new Error(`${variable} tiene que ser 32 bytes en base64.`);
  }
  return key;
}

export function cifrar(texto: string, variable = 'MP_TOKEN_ENC_KEY'): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', clave(variable), iv);
  const enc = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
}

export function descifrar(payload: string, variable = 'MP_TOKEN_ENC_KEY'): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', clave(variable), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
