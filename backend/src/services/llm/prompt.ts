import type { ChatContextMessage } from '@shared';

/** 要求模型照结构化 JSON 回复（项目规格说明书 3.3） */
const OUTPUT_FORMAT =
  '请只用 JSON 回复，格式为 {"emotion": "...", "action": "...", "expression": "...", "text": "..."}；text 一律使用简体中文，不使用表情符号。';

/** 组系统提示词：人设 + 怎么称呼用户 + 输出格式 */
export function buildSystemPrompt(persona: string, username: string): string {
  return [
    persona.trim(),
    `与你对话的用户名叫「${username}」，请用这个名字称呼对方。`,
    OUTPUT_FORMAT,
  ].join('\n\n');
}

/** 给真实模型的完整消息：系统提示词在最前面 */
export function buildModelMessages(
  systemPrompt: string,
  history: ChatContextMessage[],
): ChatContextMessage[] {
  return [{ role: 'system', content: systemPrompt }, ...history];
}
