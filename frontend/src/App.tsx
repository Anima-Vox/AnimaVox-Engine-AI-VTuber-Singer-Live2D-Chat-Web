import { useEffect } from 'react';
import { ChatHeader } from './components/chat/ChatHeader';
import { Composer } from './components/chat/Composer';
import { MessageList } from './components/chat/MessageList';
import { StagePanel } from './components/stage/StagePanel';
import { chatTransport } from './services/chat';
import { useChatStore } from './stores/chatStore';

/**
 * 文字对话版主界面（以 2560 × 1440 为基准）：
 * 左边舞台（之后放 Live2D），右边对话。宽度不足 1100px 时只显示对话。
 */
export function App() {
  const messages = useChatStore((state) => state.messages);
  const status = useChatStore((state) => state.status);
  const notice = useChatStore((state) => state.notice);
  const currentEmotion = useChatStore((state) => state.currentEmotion);
  const load = useChatStore((state) => state.load);
  const send = useChatStore((state) => state.send);
  const retry = useChatStore((state) => state.retry);
  const stop = useChatStore((state) => state.stop);
  const clear = useChatStore((state) => state.clear);
  const dismissNotice = useChatStore((state) => state.dismissNotice);

  useEffect(() => {
    void load();
  }, [load]);

  const isWaiting = status === 'waiting';
  const isLoading = status === 'loading';

  return (
    <div className="grid h-full grid-cols-1 min-[1100px]:grid-cols-[minmax(0,38fr)_minmax(0,62fr)]">
      <StagePanel emotion={currentEmotion} isThinking={isWaiting} />

      <main className="flex min-h-0 flex-col">
        <ChatHeader
          mode={chatTransport.mode}
          emotion={currentEmotion}
          canClear={messages.length > 0 || isWaiting}
          onClear={() => void clear()}
        />
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isWaiting={isWaiting}
          notice={notice}
          onPick={(text) => void send(text)}
          onRetry={() => void retry()}
          onDismiss={dismissNotice}
        />
        <Composer
          isWaiting={isWaiting}
          disabled={isLoading}
          onSend={(text) => void send(text)}
          onStop={stop}
        />
      </main>
    </div>
  );
}
