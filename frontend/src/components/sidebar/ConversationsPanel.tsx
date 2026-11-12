import clsx from 'clsx';
import { useEffect, useState } from 'react';
import type { Conversation } from '@shared';
import type { CharacterProfile } from '../../config/characters';
import { useT } from '../../i18n';
import { formatSidebarTime } from '../../utils/time';
import { PlusIcon, TrashIcon } from '../common/icons';
import { OverlayPanel } from '../overlay/OverlayPage';

interface ConversationsPanelProps {
  character: CharacterProfile;
  conversations: Conversation[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
}

interface ItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

/** 一条历史对话；删除需要再确认一次，4 秒内没确认就复原 */
function ConversationItem({ conversation, isActive, onSelect, onDelete }: ItemProps) {
  const t = useT().conversations;
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) {
      return;
    }
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <li
      className={clsx(
        'group flex items-center gap-1 rounded-xl pr-1.5 transition-colors',
        isActive ? 'bg-signal-soft' : 'hover:bg-mist',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? 'true' : undefined}
        className="flex min-w-0 flex-1 items-baseline gap-3 py-2.5 pl-3.5 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-[0.95rem] text-ink">
          {conversation.title}
        </span>
        <time dateTime={conversation.updatedAt} className="shrink-0 text-[0.75rem] text-haze">
          {formatSidebarTime(conversation.updatedAt, t.yesterday)}
        </time>
      </button>
      {confirming ? (
        <button
          type="button"
          onClick={onDelete}
          onBlur={() => setConfirming(false)}
          className="shrink-0 rounded-lg bg-alert px-2.5 py-1 text-[0.8rem] text-white"
        >
          {t.confirmDelete}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={t.deleteNamed(conversation.title)}
          title={t.delete}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-haze opacity-0 transition hover:bg-mist-deep hover:text-alert focus-visible:opacity-100 group-hover:opacity-100"
        >
          <TrashIcon className="text-[1rem]" />
        </button>
      )}
    </li>
  );
}

/** 与当前角色的历史对话，排版与一般大模型聊天应用相同 */
export function ConversationsPanel({
  character,
  conversations,
  activeId,
  onNew,
  onSelect,
  onDelete,
}: ConversationsPanelProps) {
  const t = useT().conversations;
  return (
    <OverlayPanel
      title={t.title(character)}
      action={
        <button
          type="button"
          onClick={onNew}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-signal-soft px-3.5 py-1.5 text-[0.85rem] text-signal-deep transition-colors hover:bg-signal hover:text-white"
        >
          <PlusIcon className="text-[0.95rem]" />
          {t.new}
        </button>
      }
    >
      <ul className="flex flex-col gap-0.5">
        {activeId === null && (
          <li className="rounded-xl bg-signal-soft px-3.5 py-2.5 text-[0.95rem] text-ink">
            {t.untitled}
          </li>
        )}
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === activeId}
            onSelect={() => onSelect(conversation.id)}
            onDelete={() => onDelete(conversation.id)}
          />
        ))}
      </ul>
      {conversations.length === 0 && (
        <p className="px-3.5 pt-3 text-[0.85rem] leading-relaxed text-haze">{t.empty}</p>
      )}
    </OverlayPanel>
  );
}
