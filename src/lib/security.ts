/**
 * Security & Data Protection Utilities
 * Provides masking, audit log sanitization, webhook signature verification,
 * and password strength policies.
 */

/**
 * Masks an email address for safe display or logging.
 * Example: 'alex.morgan@vingo.internal' -> 'a***n@vingo.internal'
 */
export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return '***@***.***';
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }
  const maskedLocal = `${localPart[0]}${'*'.repeat(Math.max(localPart.length - 2, 3))}${localPart[localPart.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Masks a phone number.
 * Example: '+1 555-0199' -> '+1 555-**99'
 */
export function maskPhone(phone?: string): string {
  if (!phone) return '***';
  const clean = phone.trim();
  if (clean.length <= 4) return '****';
  const visibleEnd = clean.slice(-2);
  const visibleStart = clean.slice(0, 4);
  return `${visibleStart}****${visibleEnd}`;
}

/**
 * Masks security tokens or secret keys.
 * Example: 'eyJhbGciOiJIUzI1Ni...' -> 'eyJh...256i'
 */
export function maskToken(token?: string): string {
  if (!token) return '***';
  if (token.length <= 8) return '********';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

/**
 * Sanitizes an object before it is recorded in persistent audit logs
 * Strips passwords, raw authorization headers, secrets, and masks sensitive PII.
 */
export function sanitizeAuditPayload<T extends Record<string, unknown> | null | undefined>(payload: T): T {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const sensitiveKeys = new Set([
    'password',
    'password_hash',
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'secret',
    'client_secret',
    'authorization',
    'salary',
    'bank_account',
    'routing_number',
    'ssn',
    'tax_id'
  ]);

  const sanitized: any = Array.isArray(payload) ? [] : {};

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey.includes('email') && typeof value === 'string') {
      sanitized[key] = maskEmail(value);
    } else if (lowerKey.includes('phone') && typeof value === 'string') {
      sanitized[key] = maskPhone(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeAuditPayload(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Constant-time string comparison preventing timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifies HMAC-SHA256 signature for inbound webhooks.
 */
export async function verifyHmacSha256(
  payloadText: string,
  signatureHex: string,
  secretKey: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(payloadText);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify', 'sign']
    );

    const expectedSignatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedHex = Array.from(new Uint8Array(expectedSignatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return timingSafeEqual(expectedHex.toLowerCase(), signatureHex.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Password complexity evaluator
 */
export interface PasswordEvaluation {
  valid: boolean;
  score: number; // 0 to 4
  feedback: string[];
}

export function evaluatePasswordComplexity(password: string): PasswordEvaluation {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('Password must be at least 8 characters long.');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Must include at least one uppercase letter (A-Z).');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Must include at least one lowercase letter (a-z).');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Must include at least one number (0-9).');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Must include at least one special character (!@#$%^&*).');

  return {
    valid: feedback.length === 0,
    score: Math.min(score, 4),
    feedback
  };
}
