import type { Message, MessagePreview } from '../types';
import { Avatar } from './Avatar';
import { MessageBody } from './MessageBody';
import { QuoteIcon, TrashIcon } from './icons';
import { formatTime, previewText } from '../lib/format';

interface QuotePreviewProps {
  preview: MessagePreview;
  align: 'left' | 'right';
}

function QuotePreview({ preview, align }: QuotePreviewProps) {
  return (
    <div
      className={`mb-1.5 max-w-[420px] border-l-2 border-accent/70 pl-2.5 text-left text-[12px] text-muted ${
        align === 'right' ? 'self-end text-right' : ''
      }`}
    >
      <span className="font-medium text-accent/90">{preview.author.name}</span>
      <span className="mx-1 text-muted/60">:</span>
      <span>{previewText(preview.body, 80)}</span>
    </div>
  );
}

interface MessageItemProps {
  message: Message;
  isMine: boolean;
  onQuote: (message: Message) => void;
  onDelete: (message: Message) => void;
}

export function MessageItem({ message, isMine, onQuote, onDelete }: MessageItemProps) {
  const bubbleTone = isMine ? 'bg-mint text-ink' : 'bg-[#33323C] text-content';

  return (
    <div className={`group flex gap-3 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar
        name={message.author.name}
        color={message.author.avatarColor}
        size={40}
        className="mt-0.5"
      />

      <div className={`flex min-w-0 max-w-[72%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        <div className="mb-1 flex items-baseline gap-2 text-[12px]">
          <span className="font-medium text-content/80">{message.author.name}</span>
          <span className="text-muted">{formatTime(message.createdAt)}</span>
          {message.editedAt ? <span className="text-muted/70">(edited)</span> : null}
        </div>

        {message.replyTo ? (
          <QuotePreview preview={message.replyTo} align={isMine ? 'right' : 'left'} />
        ) : null}

        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${bubbleTone} ${
            isMine ? 'rounded-tr-md' : 'rounded-tl-md'
          }`}
        >
          <MessageBody
            body={message.body}
            mentions={message.mentions}
            tone={isMine ? 'light' : 'dark'}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 self-center opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-[#221F28] p-1 shadow-popover">
          <button
            type="button"
            onClick={() => onQuote(message)}
            className="flex h-7 w-7 items-center justify-center rounded text-muted transition hover:bg-white/10 hover:text-content"
            aria-label="Quote reply"
            title="Quote reply"
          >
            <QuoteIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(message)}
            className="flex h-7 w-7 items-center justify-center rounded text-muted transition hover:bg-badge/20 hover:text-badge"
            aria-label="Delete message"
            title="Delete message"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
