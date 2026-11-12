import type { CharacterProfile } from '../../config/characters';
import type { NoticeReason } from '../../stores/chatStore';

type Names = Pick<CharacterProfile, 'name' | 'shortName' | 'englishName'>;

/** 简体中文界面文字（基准）。繁體由这份逐字转换，英文照同样的结构翻译。 */
export const zhCN = {
  nav: {
    menu: '主菜单',
    conversations: { label: '对话', title: '对话记录' },
    characters: { label: '角色', title: '切换角色' },
    persona: { label: '人设', title: '人设 Prompt' },
    api: { label: 'API', title: '模型与 API' },
    settings: { label: '设置', title: '设置' },
  },
  overlay: {
    close: '关闭',
  },
  conversations: {
    title: (character: Names) => `和${character.shortName}的对话`,
    new: '新对话',
    untitled: '新的对话',
    empty: '发出第一句话后，对话会保存在这里。',
    delete: '删除对话',
    deleteNamed: (title: string) => `删除对话：${title}`,
    confirmDelete: '确认删除',
    yesterday: '昨天',
  },
  characters: {
    title: '角色',
    official: '官方',
    create: '创建自己的角色',
    comingSoon: '开源引擎功能，即将开放',
  },
  persona: {
    title: '人设 Prompt',
    locked: (character: Names) =>
      `${character.name}是官方角色，人设由官方维护，不能修改，也不会显示在前端。`,
    editorSoon: '人设编辑器即将开放。',
    name: '名字',
    englishName: '英文名',
    tagline: '简介',
    customNote: '使用者自己创建的角色可以在这里编写人设（开源引擎功能，即将开放）。',
  },
  api: {
    title: '模型与 API',
    locked: (character: Names) =>
      `${character.name}固定使用官方模型与 API，不需要也不能填写自己的 Key。`,
    customSoon: '自定义 API 设置即将开放。',
    channel: '对话通道',
    channels: { mock: '演示（浏览器内假后端）', http: '自家后端' },
    backendUrl: '后端地址',
    customNote: '使用者自己创建的角色可以接入自己的模型与 API（开源引擎功能，即将开放）。',
  },
  settings: {
    title: '设置',
    language: '界面语言',
    history: '聊天记录',
    historyValue: '只保存在这个浏览器里',
    engine: '引擎',
    engineValue: 'AnimaVox 心音',
    version: '版本',
    versionValue: '文字对话版 0.2',
  },
  chat: {
    demoBadge: '演示模式：回复来自假后端',
    you: '你说',
    says: (character: Names) => `${character.shortName}说`,
    typing: (character: Names) => `${character.shortName}正在输入`,
    starters: '可以这样开始',
    placeholder: (character: Names) => `和${character.shortName}说点什么…`,
    input: '消息输入框',
    send: '发送',
    stop: '停止等待回复',
    hint: '按 Enter 发送，Shift + Enter 换行',
  },
  notice: {
    failed: (reason: string) => `没有收到回复。${reason}`,
    retry: '重试',
    close: '关闭',
    server: (status?: number, detail?: string) =>
      `服务器返回错误${status ? `（${status}）` : ''}${detail ? `：${detail}` : '。'}`,
    reasons: {
      unanswered: '这条消息还没有收到回复。',
      history: '读取本地聊天记录失败，新的消息仍可以正常发送。',
      aborted: '已停止等待回复。',
      timeout: '等了太久没有回应，请稍后再试。',
      network: '连不上服务器，请检查网络或确认后端已经启动。',
      invalid_response: '服务器返回的数据格式不对，请联系后端检查。',
      unknown: '出了点意外，请再试一次。',
      save: '这句话没能保存到浏览器，所以没有发出去，请再发一次。',
    } satisfies Record<Exclude<NoticeReason, 'http'>, string>,
  },
};

export type Messages = typeof zhCN;
