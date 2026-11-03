import { CHARACTER } from '../../config/character';
import { Avatar } from '../common/Avatar';

/** 等待回复时的「正在输入」气泡 */
export function TypingBubble() {
  return (
    <div className="flex items-start gap-3.5" role="status">
      <Avatar />
      <div className="flex h-[3.15rem] items-center gap-1.5 rounded-[1.15rem] rounded-tl-md border border-mist-deep bg-white px-5">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            aria-hidden="true"
            className="h-2 w-2 animate-dot-bounce rounded-full bg-signal"
            style={{ animationDelay: `${index * 0.16}s` }}
          />
        ))}
        <span className="sr-only">{CHARACTER.shortName}正在输入</span>
      </div>
    </div>
  );
}
