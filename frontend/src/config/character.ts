/**
 * 角色在界面上的展示信息（只影响前端显示，不影响后端人格）。
 * 佳尹的人格 Prompt 由后端持有并锁定，这里不放任何 System Prompt。
 */
export const CHARACTER = {
  /** 与后端约定的角色 ID，写进会话记录 */
  id: 'lijiaying',
  /** 中文名 */
  name: '李佳尹',
  /** 日常称呼 */
  shortName: '佳尹',
  /** 英文名（刻意不用标准拼音） */
  englishName: 'Jayin Li',
  /** 头像里显示的单字（立绘完成前的占位） */
  monogram: '佳',
  /** 空对话时显示的第一句话 */
  greeting: '嗨，我是佳尹。今天想聊点什么？',
  /** 空对话时的建议话题，点一下就会直接发送 */
  suggestions: ['最近在忙什么？', '给我推荐一首歌吧', '你们社团平时做什么？'],
} as const;
