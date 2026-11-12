import { useEffect, useRef, useState } from 'react';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChatHeader } from './components/chat/ChatHeader';
import { Composer } from './components/chat/Composer';
import { MessageList } from './components/chat/MessageList';
import { Live2DSlot } from './components/live2d/Live2DSlot';
import { NavRail, type PanelId } from './components/nav/NavRail';
import { OverlayPage } from './components/overlay/OverlayPage';
import { ApiPanel } from './components/sidebar/ApiPanel';
import { CharactersPanel } from './components/sidebar/CharactersPanel';
import { ConversationsPanel } from './components/sidebar/ConversationsPanel';
import { PersonaPanel } from './components/sidebar/PersonaPanel';
import { SettingsPanel } from './components/sidebar/SettingsPanel';
import { getCharacter, OFFICIAL_CHARACTERS } from './config/characters';
import { useT } from './i18n';
import { chatBackend } from './services/backend';
import { useAuthStore } from './stores/authStore';
import { useCharacterStore } from './stores/characterStore';
import { useChatStore } from './stores/chatStore';
import { useLocaleStore } from './stores/localeStore';

/**
 * 主界面：主页只有中间的对话栏（宽 60vw、水平置中、上下占满；窄于 800px 时全宽）。
 * - 对话栏中间、消息后面一层是 Live2D 预留位置（透明、无框）。
 * - 左边工具栏浮在主页之上，平时收起，鼠标靠近才滑出（见 NavRail）。
 * - 工具栏的每一项都打开盖在主页上的二级页面（见 OverlayPage），主页在后面模糊柔焦。
 */
export function App() {
  /** 当前打开的二级页面；null = 只显示主页 */
  const [panel, setPanel] = useState<PanelId | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const isRestored = useCharacterStore((state) => state.isRestored);
  const restoreCharacter = useCharacterStore((state) => state.restore);
  const switchCharacter = useCharacterStore((state) => state.switchTo);

  const locale = useLocaleStore((state) => state.locale);
  const restoreLocale = useLocaleStore((state) => state.restore);
  const t = useT();

  // 接后端（http）时要先登录；演示模式不需要帐号
  const authStatus = useAuthStore((state) => state.status);
  const restoreAuth = useAuthStore((state) => state.restore);
  const isSignedIn = authStatus === 'signed-in';

  const chat = useChatStore();
  const { openCharacter } = chat;
  const character = getCharacter(activeCharacterId);
  const isOverlayOpen = panel !== null;

  useEffect(() => {
    void restoreCharacter();
    void restoreLocale();
    void restoreAuth();
  }, [restoreCharacter, restoreLocale, restoreAuth]);

  // 让浏览器按语言选字形（繁体用繁中字体）
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // 角色确定（或切换）、登录之后，读出这个角色的历史对话
  useEffect(() => {
    if (isRestored && isSignedIn) {
      void openCharacter(activeCharacterId);
    }
  }, [isRestored, isSignedIn, activeCharacterId, openCharacter]);

  // 登出后关掉二级页面，下次登录回到主页
  useEffect(() => {
    if (!isSignedIn) {
      setPanel(null);
    }
  }, [isSignedIn]);

  // 二级页面开着时，模糊层下的主页点不到、Tab 也走不进去，读屏软件也跳过
  useEffect(() => {
    mainRef.current?.toggleAttribute('inert', isOverlayOpen);
  }, [isOverlayOpen]);

  const isWaiting = chat.status === 'waiting';
  const isLoading = chat.status === 'loading';
  const activeTitle =
    chat.conversations.find((conversation) => conversation.id === chat.conversationId)?.title ??
    null;

  /** 关闭二级页面，焦点回到打开它的工具栏按钮 */
  function closeOverlay() {
    const opener = panel
      ? navRef.current?.querySelector<HTMLElement>(`[data-panel="${panel}"]`)
      : null;
    setPanel(null);
    opener?.focus();
  }

  function handleSelectCharacter(characterId: string) {
    void switchCharacter(characterId);
    setPanel('conversations');
  }

  if (!isSignedIn) {
    return <AuthScreen status={authStatus} />;
  }

  return (
    <div className="h-full">
      <NavRail ref={navRef} active={panel} onSelect={setPanel} />

      {/* 窄屏全宽时，左边让出露出的窄条 */}
      <main
        ref={mainRef}
        className="mx-auto flex h-full w-full min-w-0 flex-col pl-[var(--nav-peek)] min-[800px]:w-[60vw] min-[800px]:pl-0"
      >
        <ChatHeader character={character} title={activeTitle} mode={chatBackend.mode} />
        {/* 消息区：Live2D 预留位置在后（z-0），消息在前（z-10） */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <Live2DSlot />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <MessageList
              key={`${character.id}:${chat.conversationId ?? 'new'}`}
              character={character}
              messages={chat.messages}
              isLoading={isLoading}
              isWaiting={isWaiting}
              notice={chat.notice}
              onPick={(text) => void chat.send(text)}
              onRetry={() => void chat.retry()}
              onDismiss={chat.dismissNotice}
            />
          </div>
        </div>
        <Composer
          placeholder={t.chat.placeholder(character)}
          isWaiting={isWaiting}
          disabled={isLoading}
          onSend={(text) => void chat.send(text)}
          onStop={chat.stop}
        />
      </main>

      {panel !== null && (
        <OverlayPage pageKey={panel} onClose={closeOverlay} companionRef={navRef}>
          {panel === 'conversations' && (
            <ConversationsPanel
              character={character}
              conversations={chat.conversations}
              activeId={chat.conversationId}
              // 点选对话或新对话后回到聊天；删除对话不关闭
              onNew={() => {
                chat.startNewConversation();
                closeOverlay();
              }}
              onSelect={(id) => {
                void chat.selectConversation(id);
                closeOverlay();
              }}
              onDelete={(id) => void chat.deleteConversation(id)}
            />
          )}
          {panel === 'characters' && (
            <CharactersPanel
              characters={OFFICIAL_CHARACTERS}
              activeId={character.id}
              onSelect={handleSelectCharacter}
            />
          )}
          {panel === 'persona' && <PersonaPanel character={character} />}
          {panel === 'api' && <ApiPanel character={character} />}
          {panel === 'settings' && <SettingsPanel />}
        </OverlayPage>
      )}
    </div>
  );
}
