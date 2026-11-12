import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

/** 线条图标的公共外壳：1em 大小，跟随文字颜色 */
function StrokeIcon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** 发送：向上的箭头 */
export function SendIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth={2.2} {...props}>
      <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
    </StrokeIcon>
  );
}

/** 停止：圆角方块 */
export function StopIcon(props: IconProps) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <rect x="7" y="7" width="10" height="10" rx="2.2" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4.5 7h15M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7M6.5 7l.8 11.6c.1 1 .9 1.8 1.9 1.8h5.6c1 0 1.8-.8 1.9-1.8L17.5 7" />
    </StrokeIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth={2} {...props}>
      <path d="M12 5v14M5 12h14" />
    </StrokeIcon>
  );
}

/** 关闭：✕ */
export function CloseIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth={2} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </StrokeIcon>
  );
}

/** 下拉选单的箭头 */
export function ChevronDownIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth={2} {...props}>
      <path d="m6 9 6 6 6-6" />
    </StrokeIcon>
  );
}

/** 下拉选单里的已选标记 */
export function CheckIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth={2} {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </StrokeIcon>
  );
}

/** 对话 */
export function ChatIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M20 12.5c0 3.9-3.6 7-8 7-1.2 0-2.3-.2-3.3-.6L4.5 20l1.1-3.5C4.6 15.4 4 14 4 12.5c0-3.9 3.6-7 8-7s8 3.1 8 7Z" />
    </StrokeIcon>
  );
}

/** 角色 */
export function CharacterIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" />
    </StrokeIcon>
  );
}

/** 人设 Prompt */
export function PersonaIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M7 3.8h7.2L19 8.6v10.6c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V4.8c0-.6.4-1 1-1Z" />
      <path d="M14 3.8v4.8h5M9 12.5h6M9 16h4" />
    </StrokeIcon>
  );
}

/** 模型与 API */
export function KeyIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="8" cy="15.5" r="3.6" />
      <path d="m10.6 13 8.4-8.4M16.2 7.4l2.4 2.4M14 9.6l1.8 1.8" />
    </StrokeIcon>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </StrokeIcon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </StrokeIcon>
  );
}
