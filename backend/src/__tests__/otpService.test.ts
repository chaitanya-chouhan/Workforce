import { describe, it, expect } from 'vitest';
import { generateAssignmentOtp, hashOtp, verifyOtp, OTP_EXPIRY_MINUTES, MAX_OTP_ATTEMPTS } from '../services/otpService';

describe('OTP Service', () => {
  it('generates a 6-digit numeric OTP and a non-plaintext hash', () => {
    const { otp, otpHash, expiresAt } = generateAssignmentOtp();

    expect(otp).toMatch(/^\d{6}$/);
    expect(otpHash).toBeDefined();
    expect(otpHash).not.toBe(otp);
    expect(otpHash.length).toBe(64); // SHA-256 hex string
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('correctly verifies a matching OTP', () => {
    const { otp, otpHash, expiresAt } = generateAssignmentOtp();
    const result = verifyOtp(otp, otpHash, expiresAt, 0);

    expect(result.valid).toBe(true);
  });

  it('rejects an incorrect OTP', () => {
    const { otp, otpHash, expiresAt } = generateAssignmentOtp();
    const wrongOtp = otp === '123456' ? '654321' : '123456';
    const result = verifyOtp(wrongOtp, otpHash, expiresAt, 0);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid OTP');
  });

  it('rejects an expired OTP', () => {
    const { otp, otpHash } = generateAssignmentOtp();
    const expiredTimestamp = new Date(Date.now() - 1000).toISOString(); // 1s ago

    const result = verifyOtp(otp, otpHash, expiredTimestamp, 0);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('expired');
  });

  it('enforces maximum attempt limits', () => {
    const { otp, otpHash, expiresAt } = generateAssignmentOtp();
    const result = verifyOtp(otp, otpHash, expiresAt, MAX_OTP_ATTEMPTS);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Maximum OTP verification attempts');
  });

  it('computes deterministic hashes for the same OTP', () => {
    const hash1 = hashOtp('789012');
    const hash2 = hashOtp('789012');
    expect(hash1).toBe(hash2);
  });
});
