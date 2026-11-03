import type { Message } from '@shared';
import { getEmotionDisplay } from '../../utils/emotion';
import { formatMessageTime } from '../../utils/time';
import { Avatar } from '../common/Avatar';

interface MessageBubbleProps {
  message: Message;
}

/**
 * 一条消息。
 * 佳尹的回复只显示文字与情绪 emoji；action / expression 已保存在记录里，暂不显示。
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const time = formatMessageTime(message.createdAt);

  if (message.role === 'user') {
    return (
      <article aria-label="你说" className="flex flex-col items-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-[1.15rem] rounded-tr-md bg-signal-soft px-5 py-3 text-[1rem] leading-[1.7] text-ink">
          {message.content}
        </p>
        <time dateTime={message.createdAt} className="mt-1.5 pr-1 text-[0.75rem] text-haze">
          {time}
        </time>
      </article>
    );
  }

  return (
    <article aria-label="佳尹说" className="flex items-start gap-3.5">
      <Avatar emotion={getEmotionDisplay(message.emotion)} />
      <div className="flex min-w-0 max-w-[85%] flex-col items-start">
        <p className="whitespace-pre-wrap break-words rounded-[1.15rem] rounded-tl-md border border-mist-deep bg-white px-5 py-3 font-voice text-[1.08rem] leading-[1.8] text-ink">
          {message.content}
        </p>
        <time dateTime={message.createdAt} className="mt-1.5 pl-1 text-[0.75rem] text-haze">
          {time}
        </time>
      </div>
    </article>
  );
}
