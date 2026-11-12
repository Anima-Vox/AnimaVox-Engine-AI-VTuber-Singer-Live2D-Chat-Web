import type { CharacterProfile } from '../../config/characters';
import { useT } from '../../i18n';

interface ChatHeaderProps {
  character: CharacterProfile;
  /** 当前对话的标题；新对话还没有标题 */
  title: string | null;
}

/** 对话区顶栏：角色名字 + 目前对话的标题，右边提示这是演示模式 */
export function ChatHeader({ character, title }: ChatHeaderProps) {
  const t = useT();
  return (
    <header className="flex h-[4.5rem] shrink-0 items-center justify-between gap-4 px-8">
      <h1 className="min-w-0 truncate text-[1.05rem] font-medium text-ink">
        {/* 标题前显示当前角色的名字 */}
        <span className="font-voice">{character.name} · </span>
        {title ?? t.conversations.untitled}
      </h1>
      <p className="shrink-0 rounded-full bg-mist-deep px-3.5 py-1.5 text-[0.8rem] text-haze">
        {t.chat.demoBadge}
      </p>
    </header>
  );
}
