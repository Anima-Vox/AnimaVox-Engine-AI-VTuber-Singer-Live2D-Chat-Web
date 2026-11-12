/**
 * 前端用到的三种资料。纯净版没有后端，这些资料都只存在浏览器里（IndexedDB）。
 */

/** 一段对话（历史列表里的一行） */
export interface Conversation {
  id: string;
  /** 标题：取第一句话的前 24 个字 */
  title: string;
  /** 和哪个角色的对话（见 config/characters.ts） */
  characterId: string;
  createdAt: string;
  /** 最后一条消息的时间；历史列表按它排序 */
  updatedAt: string;
}

/** 对话里的一条消息 */
export interface Message {
  id: string;
  conversationId: string;
  /** user = 用户说的；assistant = 角色说的 */
  role: 'user' | 'assistant';
  content: string;
  /** 以下三项只有角色的回复才有，留给之后的 Live2D 与语音使用 */
  emotion?: string;
  action?: string;
  expression?: string;
  createdAt: string;
}

/** 角色的一次回复（项目规格说明书 3.3）：文字之外，还有情绪、动作、表情 */
export interface CharacterReply {
  emotion: string;
  action: string;
  expression: string;
  text: string;
}
