import type { LLMResponse } from '@shared';

/**
 * 假后端的台词表（仅供体验界面，正式回复由后端的 LLM 生成）。
 * 每条都是完整的结构化 JSON：emotion / action / expression / text / tool_calls，
 * 字段取值都在 项目规格说明书 3.3 的枚举表内。
 * 关键词同时接受简体与繁体输入。
 */

interface ReplyRule {
  pattern: RegExp;
  reply: LLMResponse;
}

export const MOCK_RULES: readonly ReplyRule[] = [
  {
    pattern: /(你好|您好|哈喽|哈囉|嗨|hi|hello|在吗|在嗎|早安|晚安|早上好|晚上好)/i,
    reply: {
      emotion: 'happy',
      action: 'greeting',
      expression: 'smile',
      text: '嗨～你来啦。我刚把今天的功课收尾，正好想找人说说话。',
      tool_calls: [],
    },
  },
  {
    pattern: /(累|难过|難過|伤心|傷心|不开心|不開心|压力|壓力|烦|煩|emo)/i,
    reply: {
      emotion: 'sad',
      action: 'nod',
      expression: 'frown',
      text: '辛苦了。先别急着把事情想完，跟我说说发生了什么？我在听。',
      tool_calls: [],
    },
  },
  {
    pattern: /(喜欢你|喜歡你|可爱|可愛|好看|厉害|厲害)/,
    reply: {
      emotion: 'shy',
      action: 'head_tilt',
      expression: 'blush',
      text: '欸……突然这么说，我都不知道该怎么接了啦。',
      tool_calls: [],
    },
  },
  {
    pattern: /(讨厌|討厭|笨蛋|滚|滾)/,
    reply: {
      emotion: 'angry',
      action: 'shake',
      expression: 'frown',
      text: '哼，这样说我可是会生气的。',
      tool_calls: [],
    },
  },
  {
    pattern: /(歌|音乐|音樂|唱|编曲|編曲|混音|社团|社團)/,
    reply: {
      emotion: 'happy',
      action: 'nod',
      expression: 'smile',
      text: '说到这个我就来劲了！最近社团在练混音，耳机戴得耳朵都疼，但真的好好玩。',
      tool_calls: [],
    },
  },
  {
    pattern: /(什么|什麼|为什么|為什麼|怎么|怎麼|吗|嗎|？|\?)/,
    reply: {
      emotion: 'surprised',
      action: 'head_tilt',
      expression: 'surprise',
      text: '嗯？这个问题我得认真想想。等我正式上线，再好好回答你，好不好？',
      tool_calls: [],
    },
  },
];

/** 没有命中任何关键词时轮流使用 */
export const MOCK_FALLBACKS: readonly LLMResponse[] = [
  {
    emotion: 'neutral',
    action: 'idle',
    expression: 'neutral',
    text: '嗯嗯，我在听。你接着说？',
    tool_calls: [],
  },
  {
    emotion: 'playful',
    action: 'head_tilt',
    expression: 'smile',
    text: '那你猜猜，我现在在干嘛？',
    tool_calls: [],
  },
  {
    emotion: 'happy',
    action: 'nod',
    expression: 'smile',
    text: '好呀，这个我记下了。',
    tool_calls: [],
  },
];

/** 输入里带这几个字时，假后端会故意返回一次错误，用来查看出错界面 */
export const MOCK_ERROR_TRIGGER = /(模拟错误|模擬錯誤)/;
