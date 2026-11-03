/**
 * 角色注册表（AnimaVox 引擎的角色入口）。
 *
 * - official：官方角色（李佳尹、羽澄糯）。人设、模型、形象都由官方锁定，界面上不能修改。
 * - custom：使用者自己创建的角色（开源引擎功能，后续开放），可以自带人设、API 与 Live2D。
 *
 * 这里只放「界面显示」需要的信息；人格 Prompt 由后端持有，不在前端出现。
 */

export type CharacterOrigin = 'official' | 'custom';

/** 右侧展示框里放什么 */
export type CharacterVisual =
  /** 形象还在制作中：显示占位文字 */
  | { kind: 'placeholder'; caption: string; note: string }
  /** 静态立绘 */
  | { kind: 'image'; src: string; alt: string }
  /** Live2D 模型（Phase 2 接入渲染器） */
  | { kind: 'live2d'; modelUrl: string };

export interface CharacterProfile {
  /** 与后端约定的角色 ID，写进会话记录与对话请求 */
  id: string;
  origin: CharacterOrigin;
  /** 中文名 */
  name: string;
  /** 日常称呼 */
  shortName: string;
  englishName: string;
  /** 头像里显示的单字（立绘完成前的占位） */
  monogram: string;
  /** 角色列表里的一句话介绍 */
  tagline: string;
  /** 空对话时显示的第一句话 */
  greeting: string;
  /** 空对话时的建议话题，点一下就会直接发送 */
  suggestions: readonly string[];
  visual: CharacterVisual;
}

export const OFFICIAL_CHARACTERS: readonly CharacterProfile[] = [
  {
    id: 'lijiaying',
    origin: 'official',
    name: '李佳尹',
    shortName: '佳尹',
    englishName: 'Jayin Li',
    monogram: '尹',
    tagline: '来自平行世界的 18 岁上海女生',
    greeting: '嗨，我是佳尹。今天想聊点什么？',
    suggestions: ['最近在忙什么？', '给我推荐一首歌吧', '你有在玩什么游戏呀？'],
    visual: { kind: 'placeholder', caption: '立绘制作中', note: 'Phase 2' },
  },
  {
    id: 'yuchengnuo',
    origin: 'official',
    name: '羽澄糯',
    shortName: '阿糯',
    englishName: 'Yuchen Nuo',
    monogram: '糯',
    tagline: '治愈系的元气女大生',
    greeting: '嘿嘿～我是阿糯！今天过得怎么样呀？',
    suggestions: ['今天有点累，陪我聊聊', '最近在追什么番？', '推荐一杯奶茶吧'],
    visual: { kind: 'placeholder', caption: '形象制作中', note: 'Phase 2' },
  },
];

export const DEFAULT_CHARACTER_ID = 'lijiaying';

export function findCharacter(id: string | null | undefined): CharacterProfile | undefined {
  return OFFICIAL_CHARACTERS.find((character) => character.id === id);
}

/** 找不到时回落到李佳尹，界面永远有一个可用的角色 */
export function getCharacter(id: string | null | undefined): CharacterProfile {
  return findCharacter(id) ?? findCharacter(DEFAULT_CHARACTER_ID)!;
}

/** 官方角色锁定：不能改人设、不能换 API、不能换形象 */
export function isLocked(character: CharacterProfile): boolean {
  return character.origin === 'official';
}
