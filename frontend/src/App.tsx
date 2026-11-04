import { useEffect, useState } from 'react';
import { ChatHeader } from './components/chat/ChatHeader';
import { Composer } from './components/chat/Composer';
import { MessageList } from './components/chat/MessageList';
import { NavRail, type PanelId } from './components/nav/NavRail';
import { ApiPanel } from './components/sidebar/ApiPanel';
import { CharactersPanel } from './components/sidebar/CharactersPanel';
import { ConversationsPanel } from './components/sidebar/ConversationsPanel';
import { PersonaPanel } from './components/sidebar/PersonaPanel';
import { SettingsPanel } from './components/sidebar/SettingsPanel';
import { CharacterStage } from './components/stage/CharacterStage';
import { getCharacter, OFFICIAL_CHARACTERS } from './config/characters';
import { useT } from './i18n';
import { chatTransport } from './services/chat';
import { useCharacterStore } from './stores/characterStore';
import { useChatStore } from './stores/chatStore';
import { useLocaleStore } from './stores/localeStore';

/**
 * 主界面（以 2560 × 1440 为基准）：
 * 左 1/4 = 菜单栏 + 侧边列表；中 2/4 = 对话；右 1/4 = 角色展示框（之后放 Live2D）。
 * 宽度不足 1200px 时隐藏展示框，不足 800px 时再隐藏侧边列表。
 */
export function App() {
  const [panel, setPanel] = useState<PanelId>('conversations');

  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const isRestored = useCharacterStore((state) => state.isRestored);
  const restoreCharacter = useCharacterStore((state) => state.restore);
  const switchCharacter = useCharacterStore((state) => state.switchTo);

  const locale = useLocaleStore((state) => state.locale);
  const restoreLocale = useLocaleStore((state) => state.restore);
  const t = useT();

  const chat = useChatStore();
  const { openCharacter } = chat;
  const character = getCharacter(activeCharacterId);

  useEffect(() => {
    void restoreCharacter();
    void restoreLocale();
  }, [restoreCharacter, restoreLocale]);

  // 让浏览器按语言选字形（繁体用繁中字体）
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // 角色确定（或切换）后，读出这个角色的历史对话
  useEffect(() => {
    if (isRestored) {
      void openCharacter(activeCharacterId);
    }
  }, [isRestored, activeCharacterId, openCharacter]);

  const isWaiting = chat.status === 'waiting';
  const isLoading = chat.status === 'loading';
  const activeTitle =
    chat.conversations.find((conversation) => conversation.id === chat.conversationId)?.title ??
    null;

  function handleSelectCharacter(characterId: string) {
    void switchCharacter(characterId);
    setPanel('conversations');
  }

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,3fr)] max-[800px]:grid-cols-[auto_minmax(0,1fr)] min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex min-h-0">
        <NavRail active={panel} onSelect={setPanel} />
        <div className="flex min-h-0 min-w-0 flex-1 border-r border-mist-deep max-[800px]:hidden">
          {panel === 'conversations' && (
            <ConversationsPanel
              character={character}
              conversations={chat.conversations}
              activeId={chat.conversationId}
              onNew={chat.startNewConversation}
              onSelect={(id) => void chat.selectConversation(id)}
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
        </div>
      </div>

      <main className="flex min-h-0 min-w-0 flex-col">
        <ChatHeader character={character} title={activeTitle} mode={chatTransport.mode} />
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
        <Composer
          placeholder={t.chat.placeholder(character)}
          isWaiting={isWaiting}
          disabled={isLoading}
          onSend={(text) => void chat.send(text)}
          onStop={chat.stop}
        />
      </main>

      <div className="hidden min-h-0 min-[1200px]:flex">
        <CharacterStage character={character} isThinking={isWaiting} />
      </div>
    </div>
  );
}
