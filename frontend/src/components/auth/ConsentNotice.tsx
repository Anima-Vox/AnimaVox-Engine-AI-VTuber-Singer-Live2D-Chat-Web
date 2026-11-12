import { useEffect, useRef, useState } from 'react';
import { useT } from '../../i18n';

interface ConsentNoticeProps {
  /** 选了同意或不同意（只有看完才能选） */
  onChoose: (trainingConsent: boolean) => void;
  onBack: () => void;
  busy: boolean;
}

/** 离底部这么近就算看完（像素） */
const BOTTOM_TOLERANCE = 4;

/**
 * 首次注册时的说明：要滑到最底下看完，才能选择是否同意对话资料用于训练。
 * 两个选项都能完成注册（不同意也能正常使用）。
 */
export function ConsentNotice({ onChoose, onBack, busy }: ConsentNoticeProps) {
  const t = useT().consent;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasRead, setHasRead] = useState(false);

  function checkBottom() {
    const box = scrollRef.current;
    if (box && box.scrollTop + box.clientHeight >= box.scrollHeight - BOTTOM_TOLERANCE) {
      setHasRead(true);
    }
  }

  // 内容短到不需要滚动时，一打开就算看完
  useEffect(checkBottom, []);

  const disabled = !hasRead || busy;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[1.05rem] font-medium text-ink">{t.title}</h2>
      <div
        ref={scrollRef}
        onScroll={checkBottom}
        tabIndex={0}
        aria-label={t.title}
        data-consent-scroll=""
        className="thin-scrollbar max-h-[16rem] overflow-y-auto rounded-xl border border-mist-deep bg-mist/50 px-5 py-4 text-[0.9rem] leading-[1.8] text-ink outline-none focus-visible:ring-4 focus-visible:ring-signal/15"
      >
        <ol className="flex list-decimal flex-col gap-3 pl-4">
          {t.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>
      {!hasRead && (
        <p role="status" className="text-[0.8rem] text-haze">
          {t.scrollHint}
        </p>
      )}
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChoose(true)}
          className="flex-1 rounded-full bg-ink px-5 py-2.5 text-[0.9rem] text-white transition-colors hover:bg-night-raised disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.agree}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChoose(false)}
          className="flex-1 rounded-full border border-night px-5 py-2.5 text-[0.9rem] text-ink transition-colors hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.disagree}
        </button>
      </div>
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="self-start text-[0.8rem] text-haze underline-offset-4 hover:text-ink hover:underline"
      >
        {t.back}
      </button>
    </div>
  );
}
