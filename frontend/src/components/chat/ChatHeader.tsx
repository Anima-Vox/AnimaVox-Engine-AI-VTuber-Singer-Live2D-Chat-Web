import clsx from 'clsx';
import { useEffect, useState } from 'react';
import type { KnownEmotion } from '@shared';
import type { ChatTransportMode } from '../../config/app';
import { CHARACTER } from '../../config/character';
import { getEmotionDisplay } from '../../utils/emotion';
import { Avatar } from '../common/Avatar';
import { TrashIcon } from '../common/icons';

interface ChatHeaderProps {
  mode: ChatTransportMode;
  emotion: KnownEmotion;
  canClear: boolean;
  onClear: () => void;
}

/** 清空需要连点两次，避免误删；4 秒内没确认就复原 */
function ClearButton({ disabled, onClear }: { disabled: boolean; onClear: () => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) {
      return;
    }
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  function handleClick() {
    if (confirming) {
      setConfirming(false);
      onClear();
      return;
    }
    setConfirming(true);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      className={clsx(
        'flex items-center gap-2 rounded-full px-4 py-2 text-[0.9rem] transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        confirming
          ? 'bg-alert-soft text-alert'
          : 'text-haze hover:bg-mist-deep hover:text-ink disabled:hover:bg-transparent',
      )}
    >
      <TrashIcon className="text-[1.05rem]" />
      {confirming ? '再点一次，清空全部记录' : '清空对话'}
    </button>
  );
}

export function ChatHeader({ mode, emotion, canClear, onClear }: ChatHeaderProps) {
  return (
    <header className="flex h-[4.5rem] shrink-0 items-center justify-between gap-4 px-8">
      <div className="flex min-w-0 items-center gap-4">
        <h1 className="sr-only">和{CHARACTER.name}聊天</h1>
        {/* 窄屏没有舞台区时，在这里显示名字与心情 */}
        <div className="flex items-center gap-3 min-[1100px]:hidden">
          <Avatar emotion={getEmotionDisplay(emotion)} />
          <span className="font-voice text-[1.25rem]">{CHARACTER.name}</span>
        </div>
        {mode === 'mock' && (
          <p className="truncate rounded-full bg-mist-deep px-3.5 py-1.5 text-[0.8rem] text-haze">
            演示模式：回复来自假后端
          </p>
        )}
      </div>
      <ClearButton disabled={!canClear} onClear={onClear} />
    </header>
  );
}
