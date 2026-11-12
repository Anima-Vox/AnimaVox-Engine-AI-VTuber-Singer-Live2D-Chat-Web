import type { CharacterReply, Message } from '../types';
import { DEMO_ERROR_TRIGGER, pickDemoReply } from './demoReplies';

/**
 * 角色的回复从这里来 —— 整个前端只有这一个地方会「去要回复」。
 *
 * 纯净版没有后端，也没有任何接口：这里只是等一小段时间，然后从演示台词表挑一句。
 * 之后要接后端，就改写这个文件里的 getReply（怎么接、接口长什么样，都由后端决定）。
 */

/** 交给 getReply 的资料 */
export interface ReplyInput {
  /** 和哪个角色对话 */
  characterId: string;
  /** 目前这段对话的全部消息，旧的在前；最后一条就是用户刚说的话 */
  messages: Message[];
}

/** 等一小段时间；期间被中断（用户按「停止」或切换对话）就丢出 AbortError */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('已停止等待', 'AbortError'));
    });
  });
}

/**
 * 拿到角色的下一句回复。
 * - 成功：回传 { emotion, action, expression, text }
 * - 失败：丢出错误，界面会显示出错提示与「重试」
 * - signal 被中断时：丢出名字是 AbortError 的错误，界面显示「已停止等待回复」
 */
export async function getReply(
  { characterId, messages }: ReplyInput,
  signal: AbortSignal,
): Promise<CharacterReply> {
  const userText = messages.at(-1)?.content ?? '';

  // 假装「想」一下：句子越长想得越久，再加一点随机
  await wait(500 + Math.min(userText.length * 15, 700) + Math.random() * 400, signal);

  if (DEMO_ERROR_TRIGGER.test(userText)) {
    throw new Error('（演示）回复失败');
  }
  return pickDemoReply(characterId, userText);
}
