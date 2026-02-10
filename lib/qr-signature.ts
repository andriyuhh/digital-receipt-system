import { createHmac } from 'crypto'

const SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret-key'

export function generateSignature(receiptNumber: string, timestamp: string): string {
  const payload = `${receiptNumber}:${timestamp}`
  const hmac = createHmac('sha256', SECRET_KEY)
  hmac.update(payload)
  // Use standard base64 then manually make URL-safe (base64url not supported in all runtimes)
  const b64 = hmac.digest('base64')
  const urlSafe = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return urlSafe.slice(0, 16)
}

export function verifySignature(
  receiptNumber: string,
  timestamp: string,
  signature: string
): boolean {
  const expected = generateSignature(receiptNumber, timestamp)
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false
  let result = 0
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return result === 0
}

export function buildVerifyUrl(receiptNumber: string, issuedAt: string): string {
  const sig = generateSignature(receiptNumber, issuedAt)
  return `/verify/${encodeURIComponent(receiptNumber)}?sig=${sig}&t=${encodeURIComponent(issuedAt)}`
}
