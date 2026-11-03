import { useEffect, useRef } from 'react';
import type { Message } from '@shared';
import type { CharacterProfile } from '../../config/characters';
import type { ChatNotice as Notice } from '../../stores/chatStore';
import { ChatNotice } from './ChatNotice';
import { EmptyState } from './EmptyState';
import { MessageBubble } from './MessageBubble';
import { TypingBubble } from './TypingBubble';

interface MessageListProps {
  character: CharacterProfile;
  messages: Message[];
  isLoading: boolean;
  isWaiting: boolean;
  notice: Notice | null;
  onPick: (text: string) => void;
  onRetry: () => void;
  onDismiss: () => void;
}

/** 切换对话时请给它换一个 key，让滚动位置重新从底部开始 */
export function MessageList({
  character,
  messages,
  isLoading,
  isWaiting,
  notice,
  onPick,
  onRetry,
  onDismiss,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  // 打开对话时直接跳到底部；之后有新消息、开始等待或出现提示时平滑滚动
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    endRef.current?.scrollIntoView({
      behavior: hasScrolled.current ? 'smooth' : 'auto',
      block: 'end',
    });
    hasScrolled.current = true;
  }, [messages.length, isWaiting, notice]);

  const isEmpty = messages.length === 0 && !isWaiting;

  return (
    <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-[50rem] flex-col px-6">
        {isLoading ? null : isEmpty ? (
          <EmptyState character={character} onPick={onPick} disabled={isWaiting} />
        ) : (
          <div className="flex flex-col gap-6 py-8" aria-live="polite" aria-relevant="additions">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} character={character} />
            ))}
            {isWaiting && <TypingBubble character={character} />}
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
