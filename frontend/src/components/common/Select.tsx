import clsx from 'clsx';
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { CheckIcon, ChevronDownIcon } from './icons';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  /** 外部标签的 id；读屏会读成「标签 + 当前选项」 */
  labelledBy: string;
}

/**
 * 下拉选单：点开时选项从按钮下方平滑展开，和按钮连成同一个圆角框
 * （宽度、边框、内距都一致）。
 * 键盘：↑ ↓ / Home / End 移动，Enter 或空格选择，Esc 关闭。
 */
export function Select<T extends string>({ value, options, onChange, labelledBy }: SelectProps<T>) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  // 展开后把焦点交给选项列表，方便直接用键盘选
  useEffect(() => {
    if (open) {
      listRef.current?.focus();
    }
  }, [open]);

  function show() {
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  function hide(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) {
      buttonRef.current?.focus();
    }
  }

  function choose(index: number) {
    const option = options[index];
    if (option) {
      onChange(option.value);
    }
    hide(true);
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      show();
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const last = options.length - 1;
    const moves: Partial<Record<string, number>> = {
      ArrowDown: Math.min(activeIndex + 1, last),
      ArrowUp: Math.max(activeIndex - 1, 0),
      Home: 0,
      End: last,
    };
    const next = moves[event.key];
    if (next !== undefined) {
      event.preventDefault();
      setActiveIndex(next);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      hide(true);
    } else if (event.key === 'Tab') {
      hide(false);
    }
  }

  // 焦点离开整个选单（点了别处）就收起
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
    }
  }

  const optionId = (index: number) => `${id}-option-${index}`;

  return (
    <div className="relative w-fit" onBlur={handleBlur}>
      <button
        ref={buttonRef}
        id={`${id}-button`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${labelledBy} ${id}-button`}
        onClick={() => (open ? hide(true) : show())}
        onKeyDown={handleButtonKeyDown}
        className={clsx(
          'flex w-full items-center gap-6 border bg-white py-1.5 pl-3.5 pr-3 text-left text-ink focus-visible:outline-none',
          // 展开时下方两个角立刻变直角；收起时等列表收完（200ms）再变回圆角
          open
            ? 'rounded-t-xl border-signal/50 border-b-mist-deep [transition:border-color_200ms]'
            : 'rounded-xl border-mist-deep [transition:border-color_200ms,border-radius_0s_200ms] hover:border-signal/40 focus-visible:border-signal/50 focus-visible:ring-4 focus-visible:ring-signal/10',
        )}
      >
        {/* 所有选项叠在同一格：按钮宽度 = 最长的选项，展开后的列表与按钮同宽 */}
        <span className="grid">
          {options.map((option, index) => (
            <span
              key={option.value}
              aria-hidden={index !== selectedIndex}
              className={clsx('col-start-1 row-start-1', index !== selectedIndex && 'invisible')}
            >
              {option.label}
            </span>
          ))}
        </span>
        <ChevronDownIcon
          className={clsx(
            'ml-auto shrink-0 text-haze transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* 0fr → 1fr 的高度过渡：内容从按钮下方平滑展开 */}
      <div
        className={clsx(
          'absolute inset-x-0 top-full z-10 grid transition-[grid-template-rows,visibility] duration-200 ease-out',
          open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]',
        )}
      >
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelledBy}
          aria-activedescendant={open ? optionId(activeIndex) : undefined}
          onKeyDown={handleListKeyDown}
          className="min-h-0 overflow-hidden rounded-b-xl border border-t-0 border-signal/50 bg-white shadow-[0_1rem_1.5rem_-1rem_rgb(22_33_58/0.35)] outline-none"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={index === selectedIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
              className={clsx(
                'flex cursor-pointer items-center gap-6 py-1.5 pl-3.5 pr-3 transition-colors',
                index === activeIndex && 'bg-mist',
                index === selectedIndex ? 'text-signal-deep' : 'text-ink',
              )}
            >
              {option.label}
              {index === selectedIndex && <CheckIcon className="ml-auto shrink-0" />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
