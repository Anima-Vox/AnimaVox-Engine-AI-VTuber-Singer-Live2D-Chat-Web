import clsx from 'clsx';
import { useT } from '../../i18n';
import type { ChatNotice as Notice } from '../../stores/chatStore';

interface ChatNoticeProps {
  notice: Notice;
  onRetry: () => void;
  onDismiss: () => void;
}

/** 没收到回复时的提示：说清楚发生了什么，并给出重试 */
export function ChatNotice({ notice, onRetry, onDismiss }: ChatNoticeProps) {
  const t = useT().notice;
  const isError = notice.kind === 'error';
  const text = t.reasons[notice.reason];
  // 没存进浏览器、或读取记录失败时没有东西可以重试，只留「关闭」
  const canRetry = notice.reason !== 'save' && notice.reason !== 'history';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={clsx(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-5 py-3.5 text-[0.95rem]',
        isError ? 'bg-alert-soft text-alert' : 'bg-mist-deep text-haze',
      )}
    >
      <p className="min-w-0 flex-1">{isError ? t.failed(text) : text}</p>
      <div className="flex shrink-0 gap-2">
        {canRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className={clsx(
              'rounded-full px-4 py-1.5 font-medium text-white transition-colors',
              isError ? 'bg-alert hover:bg-[#962c24]' : 'bg-signal hover:bg-signal-deep',
            )}
          >
            {t.retry}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full px-3 py-1.5 transition-colors hover:bg-black/5"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
}
