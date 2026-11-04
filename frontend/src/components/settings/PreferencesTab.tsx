import clsx from 'clsx';
import { useState } from 'react';
import {
  buildConversationExport,
  conversationToMarkdown,
  downloadTextFile,
  exportTimestamp,
  sanitizeFileName,
} from '../../utils/conversationExport';
import { listConversations } from '../../db/repositories/conversationRepository';
import { listMessages } from '../../db/repositories/messageRepository';
import { clearAllLocalData } from '../../db/repositories/maintenanceRepository';
import { useCharacterStore } from '../../stores/characterStore';
import { useChatStore } from '../../stores/chatStore';
import { useUiStore } from '../../stores/uiStore';

/** 设置 · 偏好页：界面偏好、数据导出、数据与隐私、重新引导 */
export function PreferencesTab() {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const setSettingsOpen = useUiStore((state) => state.setSettingsOpen);
  const resetWizard = useUiStore((state) => state.resetWizard);
  const setView = useUiStore((state) => state.setView);

  const [pendingReset, setPendingReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState('');

  const handleReset = async () => {
    setResetting(true);
    try {
      await clearAllLocalData();
      window.location.assign('/');
    } finally {
      setResetting(false);
    }
  };

  /** 导出全部会话与消息（原生下载，不经过任何服务器） */
  const handleExportAll = async () => {
    setExporting(true);
    setExportNote('');
    try {
      const conversations = await listConversations();
      const entries = await Promise.all(
        conversations.map(async (conversation) => ({
          conversation,
          messages: await listMessages(conversation.id),
        })),
      );

      const payload = buildConversationExport(useCharacterStore.getState().character, entries);
      downloadTextFile(
        `ai-live2d-chat_${exportTimestamp()}.json`,
        JSON.stringify(payload, null, 2),
        'application/json',
      );
      setExportNote(`已导出 ${entries.length} 个会话`);
    } catch (cause) {
      setExportNote(`导出失败：${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setExporting(false);
    }
  };

  /** 导出当前会话为可读的 Markdown */
  const handleExportCurrent = async () => {
    setExporting(true);
    setExportNote('');
    try {
      const { activeConversationId, conversations } = useChatStore.getState();
      const conversation = conversations.find((item) => item.id === activeConversationId);
      if (!conversation) {
        setExportNote('当前没有可导出的会话');
        return;
      }

      const messages = await listMessages(conversation.id);
      const characterName = useCharacterStore.getState().character?.name ?? '角色';
      downloadTextFile(
        `${sanitizeFileName(conversation.title)}_${exportTimestamp()}.md`,
        conversationToMarkdown(conversation, messages, characterName),
        'text/markdown',
      );
      setExportNote(`已导出当前会话（${messages.length} 条消息）`);
    } catch (cause) {
      setExportNote(`导出失败：${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-panel bg-white/55 p-4">
        <h3 className="text-sm text-ink-deep">界面</h3>
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 text-xs">
          <span className="text-ink">打开应用时默认展开会话列表</span>
          <input
            type="checkbox"
            checked={sidebarOpen}
            onChange={(event) => setSidebarOpen(event.target.checked)}
            className="h-4 w-4 accent-pink"
          />
        </label>
        <p className="mt-2 text-[10px] text-ink-soft">
          当前仅提供浅色甜美主题，暗色夜间模式在后续版本加入。
        </p>
      </section>

      <section className="rounded-panel bg-white/55 p-4">
        <h3 className="text-sm text-ink-deep">引导</h3>
        <button
          type="button"
          onClick={() => {
            setSettingsOpen(false);
            resetWizard();
            setView('wizard');
          }}
          className="mt-3 w-full rounded-full bg-white/85 px-4 py-2 text-xs text-ink shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          重新运行首次引导
        </button>
        <p className="mt-2 text-[10px] text-ink-soft">
          会保留已有数据，只重新走一遍模型 / 角色 / 立绘三步向导。
        </p>
      </section>

      <section className="rounded-panel bg-white/55 p-4">
        <h3 className="text-sm text-ink-deep">导出聊天记录</h3>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
          导出在浏览器本地完成。JSON
          包含当前角色与会话消息，不含模型配置或界面设置，尚不支持导入恢复；Markdown
          便于阅读与分享。
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void handleExportAll()}
            disabled={exporting}
            className="flex-1 rounded-full bg-white/85 px-4 py-2 text-xs text-ink shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            导出全部（JSON）
          </button>
          <button
            type="button"
            onClick={() => void handleExportCurrent()}
            disabled={exporting}
            className="flex-1 rounded-full bg-white/85 px-4 py-2 text-xs text-ink shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            导出当前会话（Markdown）
          </button>
        </div>

        {exportNote ? (
          <p className="mt-2 text-[11px] text-ink-soft" role="status">
            {exportNote}
          </p>
        ) : null}
      </section>

      <section className="rounded-panel border border-pink/40 bg-white/45 p-4">
        <h3 className="text-sm text-ink-deep">数据与隐私</h3>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
          聊天记录、角色设定和模型配置保存在本机。发送消息时，角色设定与最近消息会传给所配置的服务，后续处理由该服务决定。
          已填写的 API Key 会明文保存在浏览器；当前本机格式校验不联网，也不发送
          Key。真实连接的密钥方案仍待确定。
        </p>

        {pendingReset ? (
          <div className="mt-3 flex flex-col gap-2 text-xs">
            <span className="text-ink-deep">会删除全部会话、角色、模型配置与设置，确定继续？</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleReset()}
                disabled={resetting}
                className={clsx(
                  'rounded-full px-4 py-1.5 text-white transition',
                  resetting ? 'cursor-wait bg-pink-deep/60' : 'bg-pink-deep hover:bg-pink-deep/85',
                )}
              >
                {resetting ? '清空中…' : '确认清空'}
              </button>
              <button
                type="button"
                onClick={() => setPendingReset(false)}
                className="rounded-full bg-white/85 px-4 py-1.5 text-ink transition hover:bg-white"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPendingReset(true)}
            className="mt-3 w-full rounded-full bg-white/85 px-4 py-2 text-xs text-pink-deep shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            清空本地数据
          </button>
        )}
      </section>

      <p className="text-center text-[10px] leading-relaxed text-ink-soft/80">
        Ai-Live2D Chat v0.1.0 · AGPL-3.0
        <br />
        记录保存在本机，发送消息时会传输上下文
      </p>
    </div>
  );
}
