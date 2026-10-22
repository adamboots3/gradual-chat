import { describe, expect, it } from 'vitest';
import { extractMentionHandles, splitMentions } from '../src/services/mentions';

describe('extractMentionHandles', () => {
  it('finds a handle at the start of the message', () => {
    expect(extractMentionHandles('@jenny can you take a look?')).toEqual(['jenny']);
  });

  it('finds handles after whitespace or punctuation', () => {
    expect(extractMentionHandles('hey (@devon) and @grace, thanks')).toEqual(['devon', 'grace']);
  });

  it('is case-insensitive and de-duplicates', () => {
    expect(extractMentionHandles('@Devon @devon @DEVON')).toEqual(['devon']);
  });

  it('never turns an email address into a mention', () => {
    expect(extractMentionHandles('write to team@example.com')).toEqual([]);
  });

  it('ignores handles that are too short', () => {
    expect(extractMentionHandles('@a is not a handle')).toEqual([]);
  });

  it('stops at punctuation', () => {
    expect(extractMentionHandles('thanks @grace.')).toEqual(['grace']);
  });

  it('keeps underscores but not dots', () => {
    expect(extractMentionHandles('@jenny_white and @devon.lane')).toEqual(['jenny_white', 'devon']);
  });
});

describe('splitMentions', () => {
  it('splits text around mentions', () => {
    expect(splitMentions('hi @jenny!')).toEqual([
      { type: 'text', value: 'hi ' },
      { type: 'mention', value: 'jenny' },
      { type: 'text', value: '!' },
    ]);
  });

  it('returns a single text chunk when there is no mention', () => {
    expect(splitMentions('nothing here')).toEqual([{ type: 'text', value: 'nothing here' }]);
  });
});
