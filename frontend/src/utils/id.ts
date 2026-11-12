import { nanoid } from 'nanoid';

/** 产生一个不会重复的短 id（对话与消息的 id） */
export function createId(): string {
  return nanoid();
}
