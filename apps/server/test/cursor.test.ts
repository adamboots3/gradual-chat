import { describe, expect, it } from 'vitest';
import { clampLimit, decodeCursor, encodeCursor } from '../src/utils/cursor';

describe('cursor helpers', () => {
  it('round-trips an ObjectId', () => {
    const id = '65c1f0a1b2c3d4e5f6071829';
    expect(String(decodeCursor(encodeCursor(id)))).toBe(id);
  });

  it('accepts a raw ObjectId (no prefix)', () => {
    const id = '65c1f0a1b2c3d4e5f6071829';
    expect(String(decodeCursor(Buffer.from(id).toString('base64url')))).toBe(id);
  });

  it('rejects garbage', () => {
    expect(() => decodeCursor('not-a-cursor')).toThrow(/cursor/i);
  });

  it('clamps the page size', () => {
    expect(clampLimit(undefined)).toBe(30);
    expect(clampLimit(0)).toBe(30);
    expect(clampLimit(10)).toBe(10);
    expect(clampLimit(5000)).toBe(100);
    expect(clampLimit(12.9)).toBe(12);
  });
});
