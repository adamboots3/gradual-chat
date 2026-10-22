/**
 * @mention parsing.
 *
 * Rules (deliberately conservative so we never turn an email address into a
 * mention):
 *  - must be preceded by start-of-string or a non-word character (not `@` or [a-z0-9_])
 *  - the handle is 2–32 chars of [a-z0-9_]
 *
 * Examples:
 *   "hey @daniel"        -> ["daniel"]
 *   "email@example.com"  -> []            (preceded by a word char)
 *   "@a"                 -> []            (too short)
 *   "@Daniel_Lee hi"     -> ["daniel_lee"] (case-insensitive)
 */
const MENTION_PATTERN = /(^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{2,32})/g;

export function extractMentionHandles(body: string): string[] {
  const handles = new Set<string>();
  for (const match of body.matchAll(MENTION_PATTERN)) {
    handles.add(match[2].toLowerCase());
  }
  return [...handles];
}

/** Handles used by the UI to highlight mentions while rendering a message. */
export function splitMentions(body: string): Array<{ type: 'text' | 'mention'; value: string }> {
  const parts: Array<{ type: 'text' | 'mention'; value: string }> = [];
  let lastIndex = 0;
  for (const match of body.matchAll(MENTION_PATTERN)) {
    const start = (match.index ?? 0) + match[1].length;
    const handle = match[2];
    if (start > lastIndex) parts.push({ type: 'text', value: body.slice(lastIndex, start) });
    parts.push({ type: 'mention', value: handle });
    lastIndex = start + handle.length + 1;
  }
  if (lastIndex < body.length) parts.push({ type: 'text', value: body.slice(lastIndex) });
  return parts;
}
