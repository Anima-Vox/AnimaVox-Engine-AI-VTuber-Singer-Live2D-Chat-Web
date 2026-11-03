import clsx from 'clsx';
import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { CHARACTER } from '../../config/character';
import { SendIcon, StopIcon } from '../common/icons';

const MAX_LENGTH = 2000;

interface ComposerProps {
  isWaiting: boolean;
  disabled: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

/** 底部输入框：Enter 发送，Shift + Enter 换行；中文输入法选字时按 Enter 不会误发 */
export function Composer({ isWaiting, disabled, onSend, onStop }: ComposerProps) {
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = draft.trim().length > 0 && !isWaiting && !disabled;

  // 输入框高度跟着内容长高（上限由 CSS 的 max-height 控制）
  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [draft]);

  function submit() {
    if (!canSend) {
      return;
    }
    onSend(draft);
    setDraft('');
    textareaRef.current?.focus();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // keyCode 229 = 输入法正在组字（部分浏览器的 isComposing 不可靠）
    const composing = event.nativeEvent.isComposing || event.keyCode === 229;
    if (event.key === 'Enter' && !event.shiftKey && !composing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[50rem] px-6 pb-6 pt-2">
      <div className="flex items-end gap-3 rounded-[1.4rem] border border-mist-deep bg-white py-2.5 pl-5 pr-2.5 transition-shadow focus-within:border-signal/50 focus-within:ring-4 focus-within:ring-signal/10">
        <textarea
          ref={textareaRef}
          value={draft}
          rows={1}
          maxLength={MAX_LENGTH}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`和${CHARACTER.shortName}说点什么…`}
          aria-label="消息输入框"
          className="thin-scrollbar max-h-[12rem] min-h-[2.75rem] flex-1 resize-none bg-transparent py-[0.55rem] text-[1rem] leading-[1.7] text-ink outline-none placeholder:text-haze/70"
        />
        {isWaiting ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="停止等待回复"
            title="停止等待回复"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-[1.1rem] text-white transition-colors hover:bg-night-raised"
          >
            <StopIcon />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="发送"
            title="发送"
            className={clsx(
              'grid h-11 w-11 shrink-0 place-items-center rounded-full text-[1.2rem] transition-colors',
              canSend
                ? 'bg-signal text-white hover:bg-signal-deep'
                : 'cursor-not-allowed bg-mist text-haze/60',
            )}
          >
            <SendIcon />
          </button>
        )}
      </div>
      <p className="mt-2.5 px-2 text-[0.75rem] text-haze">按 Enter 发送，Shift + Enter 换行</p>
    </form>
  );
}
