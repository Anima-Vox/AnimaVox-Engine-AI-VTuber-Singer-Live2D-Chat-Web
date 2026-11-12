import { nanoid } from 'nanoid';

/** 产生一个不会重复的短 id（用来当 clientMessageId） */
export function createId(): string {
  return nanoid();
}
