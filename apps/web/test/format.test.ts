import { describe, expect, it } from 'vitest';
import { formatDay, formatTime, initials, previewText } from '../src/lib/format';

describe('initials', () => {
  it('takes the first letters of the first two words', () => {
    expect(initials('Jenny White')).toBe('JW');
    expect(initials('Devon')).toBe('D');
  });

  it('never throws on missing data', () => {
    expect(initials(undefined)).toBe('?');
    expect(initials('')).toBe('?');
  });
});

describe('previewText', () => {
  it('collapses whitespace and truncates', () => {
    expect(previewText('hello\n\n  world')).toBe('hello world');
    expect(previewText('x'.repeat(60), 10)).toHaveLength(10);
    expect(previewText(undefined)).toBe('');
  });
});

describe('date formatting', () => {
  it('formats a timestamp as 24h time', () => {
    expect(formatTime(new Date(2024, 0, 2, 20, 34).toISOString())).toMatch(/20:34|8:34/);
  });

  it('labels today and yesterday', () => {
    expect(formatDay(new Date().toISOString())).toBe('Today');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatDay(yesterday.toISOString())).toBe('Yesterday');
  });

  it('degrades gracefully for invalid input', () => {
    expect(formatDay(undefined)).toBe('');
    expect(formatTime('nope')).toBe('');
  });
});
