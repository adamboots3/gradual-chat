import { describe, expect, it } from 'vitest';
import { hashPassword, signAuthToken, verifyAuthToken, verifyPassword } from '../src/auth/jwt';

describe('auth helpers', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('password123');
    expect(hash).not.toBe('password123');
    await expect(verifyPassword('password123', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });

  it('signs and verifies a token', () => {
    const token = signAuthToken('65c1f0a1b2c3d4e5f6071829', 'jenny');
    const payload = verifyAuthToken(token);
    expect(payload?.sub).toBe('65c1f0a1b2c3d4e5f6071829');
    expect(payload?.username).toBe('jenny');
  });

  it('rejects a tampered token', () => {
    const token = signAuthToken('65c1f0a1b2c3d4e5f6071829', 'jenny');
    expect(verifyAuthToken(`${token}x`)).toBeNull();
  });
});
