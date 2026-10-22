import type { ReactNode } from 'react';
import type { User } from '../types';

type Tone = 'light' | 'dark';

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*\n]+\*|~~[^~\n]+~~|`[^`\n]+`|@[A-Za-z0-9_]{2,32})/g;

function renderInline(text: string, mentionSet: Set<string>, tone: Tone, keyPrefix: string) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  INLINE_PATTERN.lastIndex = 0;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    const [token] = match;
    const start = match.index;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));

    const key = `${keyPrefix}-${start}`;
    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('~~')) {
      nodes.push(<del key={key}>{token.slice(2, -2)}</del>);
    } else if (token.startsWith('`')) {
      nodes.push(
        <code
          key={key}
          className={`rounded px-1 py-0.5 font-mono text-[0.86em] ${
            tone === 'light' ? 'bg-black/15' : 'bg-black/35'
          }`}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('@')) {
      const handle = token.slice(1).toLowerCase();
      if (mentionSet.size === 0 || mentionSet.has(handle)) {
        nodes.push(
          <span
            key={key}
            className={`rounded px-1 font-semibold ${
              tone === 'light' ? 'bg-black/15 text-ink' : 'bg-accent/15 text-accent'
            }`}
          >
            {token}
          </span>,
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    lastIndex = start + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

interface MessageBodyProps {
  body: string;
  mentions?: Array<Pick<User, 'username'>>;
  tone?: Tone;
}

/**
 * Markdown-lite renderer: **bold**, *italic*, ~~strike~~, `code`, @mentions and
 * "-"/"1." lists. Rendering is React-only — no innerHTML, so user content can
 * never inject markup.
 */
export function MessageBody({ body, mentions = [], tone = 'dark' }: MessageBodyProps) {
  const mentionSet = new Set(mentions.map((mention) => mention.username.toLowerCase()));
  const lines = body.split('\n');
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!list) return;
    const current = list;
    const items = current.items.map((item, index) => (
      <li key={`${key}-li-${index}`}>
        {renderInline(item, mentionSet, tone, `${key}-${index}`)}
      </li>
    ));
    blocks.push(
      current.ordered ? (
        <ol key={key} className="ml-5 list-decimal space-y-1">
          {items}
        </ol>
      ) : (
        <ul key={key} className="ml-5 list-disc space-y-1">
          {items}
        </ul>
      ),
    );
    list = null;
  };

  lines.forEach((line, index) => {
    const unordered = /^\s*[-*]\s+/.exec(line);
    const ordered = /^\s*\d+\.\s+/.exec(line);

    if (unordered || ordered) {
      const orderedList = Boolean(ordered);
      if (!list || list.ordered !== orderedList) {
        flushList(`list-${index}`);
        list = { ordered: orderedList, items: [] };
      }
      list.items.push(line.replace(/^\s*(?:[-*]|\d+\.)\s+/, ''));
      return;
    }

    flushList(`list-${index}`);
    blocks.push(
      <p key={`line-${index}`} className="whitespace-pre-wrap">
        {renderInline(line, mentionSet, tone, `line-${index}`)}
      </p>,
    );
  });

  flushList('list-final');
  return <div className="space-y-1 break-words text-[14px] leading-relaxed">{blocks}</div>;
}
