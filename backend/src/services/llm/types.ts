import type { CharacterId } from '../../characters';

/** 模型回的内容（项目规格说明书 3.3）：文字之外，还有给 Live2D 与语音用的情绪、动作、表情 */
export interface ModelReply {
  emotion: string;
  action: string;
  expression: string;
  text: string;
}

/** 交给模型的资料 */
export interface LlmInput {
  /** 和哪个角色对话：模型这一层按它选人设 */
  characterId: CharacterId;
  /** 用户名：角色用它称呼用户 */
  username: string;
  /** 最近的对话，旧的在前；最后一条就是这次用户说的话 */
  history: { role: 'user' | 'assistant'; content: string }[];
}

/**
 * 模型适配器：routes/chat.ts 只认这个接口。
 * 目前只有 mockAdapter.ts（演示台词）。接真实模型时照这个接口再写一个，
 * 在 server.ts 换上即可；连不上模型时丢出 ApiError('MODEL_UNAVAILABLE')。
 * signal 在等太久（LLM_TIMEOUT_MS）时会被中断，真实模型的请求要带上它。
 */
export interface LlmAdapter {
  reply(input: LlmInput, signal: AbortSignal): Promise<ModelReply>;
}
