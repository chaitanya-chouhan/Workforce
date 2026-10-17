import crypto from 'crypto';

export const OTP_EXPIRY_MINUTES = 5;
export const MAX_OTP_ATTEMPTS = 5;

const OTP_SECRET = process.env.OTP_SECRET || 'workforce_production_salt_2026';

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 * Returns the plaintext OTP (sent only to customer), its SHA-256 hash (stored in Firestore),
 * and the ISO expiration timestamp.
 */
export function generateAssignmentOtp(): {
  otp: string;
  otpHash: string;
  expiresAt: string;
} {
  // Generate 6-digit numeric OTP cryptographically
  const randomNum = crypto.randomInt(100000, 1000000);
  const otp = randomNum.toString();

  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  return { otp, otpHash, expiresAt };
}

/**
 * Computes SHA-256 hash of OTP with server-side salt.
 */
export function hashOtp(otp: string): string {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(otp.trim())
    .digest('hex');
}

/**
 * Validates entered OTP against stored hash, checking attempt count and expiration.
 */
export function verifyOtp(
  enteredOtp: string,
  storedHash: string,
  expiresAtIso: string,
  attemptCount: number
): { valid: boolean; reason?: string } {
  if (attemptCount >= MAX_OTP_ATTEMPTS) {
    return {
      valid: false,
      reason: `Maximum OTP verification attempts (${MAX_OTP_ATTEMPTS}) exceeded. Please request a new OTP.`,
    };
  }

  const expiryTime = new Date(expiresAtIso).getTime();
  if (Date.now() > expiryTime) {
    return {
      valid: false,
      reason: 'The assignment OTP has expired. Please ask the customer to generate a new OTP.',
    };
  }

  const computedHash = hashOtp(enteredOtp);
  // Constant-time comparison to prevent timing attacks
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(computedHash, 'utf8'),
    Buffer.from(storedHash, 'utf8')
  );

  if (!isMatch) {
    return {
      valid: false,
      reason: `Invalid OTP. Attempt ${attemptCount + 1} of ${MAX_OTP_ATTEMPTS}.`,
    };
  }

  return { valid: true };
}
