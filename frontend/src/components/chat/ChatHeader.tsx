import type { ChatTransportMode } from '../../config/app';
import type { CharacterProfile } from '../../config/characters';
import { useT } from '../../i18n';

interface ChatHeaderProps {
  character: CharacterProfile;
  /** 当前对话的标题；新对话还没有标题 */
  title: string | null;
  mode: ChatTransportMode;
}

/** 对话区顶栏：当前对话标题 + 演示模式提示 */
export function ChatHeader({ character, title, mode }: ChatHeaderProps) {
  const t = useT();
  return (
    <header className="flex h-[4.5rem] shrink-0 items-center justify-between gap-4 px-8">
      <h1 className="min-w-0 truncate text-[1.05rem] font-medium text-ink">
        {/* 窄屏没有右侧展示区时，在标题前补上角色名 */}
        <span className="font-voice min-[1200px]:hidden">{character.name} · </span>
        {title ?? t.conversations.untitled}
      </h1>
      {mode === 'mock' && (
        <p className="shrink-0 rounded-full bg-mist-deep px-3.5 py-1.5 text-[0.8rem] text-haze">
          {t.chat.demoBadge}
        </p>
      )}
    </header>
  );
}
