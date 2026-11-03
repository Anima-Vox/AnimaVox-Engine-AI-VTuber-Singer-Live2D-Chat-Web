import { useEffect, useRef } from 'react';
import type { Message } from '@shared';
import type { ChatNotice as Notice } from '../../stores/chatStore';
import { ChatNotice } from './ChatNotice';
import { EmptyState } from './EmptyState';
import { MessageBubble } from './MessageBubble';
import { TypingBubble } from './TypingBubble';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isWaiting: boolean;
  notice: Notice | null;
  onPick: (text: string) => void;
  onRetry: () => void;
  onDismiss: () => void;
}

export function MessageList({
  messages,
  isLoading,
  isWaiting,
  notice,
  onPick,
  onRetry,
  onDismiss,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // 有新消息、开始等待或出现提示时，滚到最底部
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isWaiting, notice]);

  const isEmpty = messages.length === 0 && !isWaiting;

  return (
    <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-[50rem] flex-col px-6">
        {isLoading ? null : isEmpty ? (
          <EmptyState onPick={onPick} disabled={isWaiting} />
        ) : (
          <div className="flex flex-col gap-6 py-8" aria-live="polite" aria-relevant="additions">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isWaiting && <TypingBubble />}
          </div>
        )}
        {notice && (
          <div className="pb-6">
            <ChatNotice notice={notice} onRetry={onRetry} onDismiss={onDismiss} />
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
