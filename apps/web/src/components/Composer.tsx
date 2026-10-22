import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useLazyQuery } from '@apollo/client';
import { SEARCH_USERS } from '../graphql/operations';
import type { Message, User } from '../types';
import { Avatar } from './Avatar';
import { AtIcon, CloseIcon, SendIcon } from './icons';
import { previewText } from '../lib/format';

const EMOJIS = ['😀', '😅', '🙌', '👍', '🔥', '🎉', '💡', '🚀', '👀', '✅', '❤️', '🙏'];

interface QuoteBarProps {
  message: Message;
  onCancel: () => void;
}

function QuoteBar({ message, onCancel }: QuoteBarProps) {
  return (
    <div className="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-accent/80 bg-white/[0.04] px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-[12px] text-muted">
        <span className="font-medium text-accent/90">{message.author.name}</span>
        <span className="mx-1">:</span>
        {previewText(message.body, 64)}
      </span>
      <button
        type="button"
        onClick={onCancel}
        className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition hover:bg-white/10 hover:text-content"
        aria-label="Cancel quote reply"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface MentionState {
  query: string;
  start: number;
}

interface ComposerProps {
  channelName: string;
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: (body: string, replyToId: string | null) => Promise<void> | void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
}

export function Composer({
  channelName,
  replyTo,
  onCancelReply,
  onSend,
  onTyping,
  onStopTyping,
  disabled,
}: ComposerProps) {
  const [text, setText] = useState('');
  const [mention, setMention] = useState<MentionState | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const composingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [searchUsers, { data: mentionData }] = useLazyQuery<{ users: User[] }, { query: string }>(
    SEARCH_USERS,
    { fetchPolicy: 'cache-first' },
  );

  const suggestions = (mentionData?.users ?? []).slice(0, 6);

  const updateMentionState = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const match = /(^|[\s(])@([a-z0-9_]*)$/i.exec(before);
    if (!match) {
      setMention(null);
      return;
    }
    const query = match[2];
    setMention({ query, start: caret - query.length - 1 });
    setHighlight(0);
    void searchUsers({ variables: { query } });
  };

  const handleChange = (value: string, caret: number) => {
    setText(value);
    updateMentionState(value, caret);
    onTyping();
    const element = textareaRef.current;
    if (element) {
      element.style.height = 'auto';
      element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
    }
  };

  const applySelection = (marker: string, placeholder = 'text') => {
    const element = textareaRef.current;
    if (!element) return;
    const { selectionStart, selectionEnd } = element;
    const selected = text.slice(selectionStart, selectionEnd) || placeholder;
    const next =
      text.slice(0, selectionStart) + marker + selected + marker + text.slice(selectionEnd);
    setText(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(
        selectionStart + marker.length,
        selectionStart + marker.length + selected.length,
      );
    });
  };

  const insertAtCaret = (snippet: string) => {
    const element = textareaRef.current;
    if (!element) {
      setText((value) => value + snippet);
      return;
    }
    const { selectionStart, selectionEnd } = element;
    const next = text.slice(0, selectionStart) + snippet + text.slice(selectionEnd);
    setText(next);
    requestAnimationFrame(() => {
      element.focus();
      const caret = selectionStart + snippet.length;
      element.setSelectionRange(caret, caret);
    });
  };

  const chooseMention = (user: User) => {
    if (!mention) return;
    const element = textareaRef.current;
    const caret = element?.selectionStart ?? text.length;
    const next = `${text.slice(0, mention.start)}@${user.username} ${text.slice(caret)}`;
    setText(next);
    setMention(null);
    requestAnimationFrame(() => {
      element?.focus();
      const position = mention.start + user.username.length + 2;
      element?.setSelectionRange(position, position);
    });
  };

  const submit = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await onSend(body, replyTo?.id ?? null);
      setText('');
      setMention(null);
      onStopTyping();
      const element = textareaRef.current;
      if (element) element.style.height = 'auto';
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : 'Could not send message. Please try again.',
      );
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (composingRef.current || event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (mention && suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlight((index) => (index + 1) % suggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlight((index) => (index - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        chooseMention(suggestions[highlight]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setMention(null);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className="relative shrink-0 border-t border-black/30 bg-panel px-4 pb-4 pt-2">
      {mention && suggestions.length > 0 ? (
        <div
          className="absolute bottom-full left-4 z-30 mb-1 w-64 overflow-hidden rounded-xl border border-line bg-[#201F27] py-1 shadow-popover"
          role="listbox"
          aria-label="Mention suggestions"
        >
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              type="button"
              role="option"
              aria-selected={index === highlight}
              onMouseDown={(event) => {
                event.preventDefault();
                chooseMention(user);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left transition ${
                index === highlight ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <Avatar name={user.name} color={user.avatarColor} size={24} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{user.name}</span>
                <span className="block truncate text-[11px] text-muted">@{user.username}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mb-1.5 flex items-center gap-0.5 text-muted">
        <ToolbarButton label="Bold" onClick={() => applySelection('**')}>
          <span className="text-[13px] font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => applySelection('*')}>
          <span className="text-[13px] italic">I</span>
        </ToolbarButton>
        <ToolbarButton label="Strikethrough" onClick={() => applySelection('~~')}>
          <span className="text-[13px] line-through">S</span>
        </ToolbarButton>
        <ToolbarButton label="Inline code" onClick={() => applySelection('`', 'code')}>
          <span className="font-mono text-[12px]">{'</>'}</span>
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <ToolbarButton label="Bullet list" onClick={() => insertAtCaret('\n- ')}>
          <span className="text-[13px]">•—</span>
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => insertAtCaret('\n1. ')}>
          <span className="text-[12px]">1.</span>
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <div className="relative">
          <ToolbarButton label="Emoji" onClick={() => setEmojiOpen((open) => !open)}>
            <span className="text-[13px]">☺</span>
          </ToolbarButton>
          {emojiOpen ? (
            <div className="absolute bottom-9 left-0 z-30 grid w-48 grid-cols-6 gap-1 rounded-xl border border-line bg-[#201F27] p-2 shadow-popover">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    insertAtCaret(emoji);
                    setEmojiOpen(false);
                  }}
                  className="rounded p-1 text-[16px] transition hover:bg-white/10"
                  aria-label={`Insert ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <ToolbarButton
          label="Mention someone"
          onClick={() => {
            insertAtCaret('@');
            const element = textareaRef.current;
            if (element) updateMentionState(`${text}@`, text.length + 1);
          }}
        >
          <AtIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        rows={1}
        disabled={disabled}
        onChange={(event) => handleChange(event.target.value, event.target.selectionStart)}
        onKeyDown={onKeyDown}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
        }}
        onClick={(event) => updateMentionState(text, event.currentTarget.selectionStart)}
        onBlur={onStopTyping}
        placeholder={`Message ${channelName}`}
        aria-label={`Message ${channelName}`}
        className="max-h-[200px] w-full resize-none bg-transparent text-[14px] leading-relaxed text-content placeholder:text-muted focus:outline-none disabled:opacity-60"
      />

      {sendError ? (
        <p role="alert" className="mt-1 text-[12px] text-badge">
          {sendError}
        </p>
      ) : null}

      {replyTo ? (
        <div className="mt-1">
          <QuoteBar message={replyTo} onCancel={onCancelReply} />
        </div>
      ) : null}

      <div className="mt-1 flex items-center justify-between">
        <p className="hidden text-[11px] text-muted/70 sm:block">
          <kbd className="rounded bg-white/5 px-1">Enter</kbd> to send ·{' '}
          <kbd className="rounded bg-white/5 px-1">Shift</kbd>+
          <kbd className="rounded bg-white/5 px-1">Enter</kbd> for a new line
        </p>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!text.trim() || sending}
          className="ml-auto flex h-8 items-center gap-1.5 rounded-lg bg-accent/90 px-3 text-[13px] font-semibold text-ink transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SendIcon className="h-4 w-4" />
          Send
        </button>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 min-w-7 items-center justify-center rounded px-1 transition hover:bg-white/10 hover:text-content"
    >
      {children}
    </button>
  );
}
