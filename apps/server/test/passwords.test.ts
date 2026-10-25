import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/services/passwords';

describe('password helpers', () => {
  it('stores a hash and accepts only the matching password', async () => {
    const hash = await hashPassword('password123');
    expect(hash).not.toBe('password123');
    await expect(verifyPassword('password123', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });
});
