/**
 * PIN de 4 dígitos. Es un bloqueo de privacidad: evita miradas indiscretas,
 * pero no cifra los datos. Se guarda solo el hash (SHA-256 con sal).
 */
export interface PinRecord {
  salt: string
  hash: string
}

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  return toHex(await crypto.subtle.digest('SHA-256', data))
}

export async function createPin(pin: string): Promise<PinRecord> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  return { salt, hash: await hashPin(pin, salt) }
}

export async function verifyPin(pin: string, rec: PinRecord): Promise<boolean> {
  return (await hashPin(pin, rec.salt)) === rec.hash
}

export const isValidPin = (pin: string) => /^\d{4}$/.test(pin)
