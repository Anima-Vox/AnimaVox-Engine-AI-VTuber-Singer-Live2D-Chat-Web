import type { LLMResponse } from '@shared';
import { DEFAULT_CHARACTER_ID } from '../../config/characters';

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

export interface MockScript {
  rules: readonly ReplyRule[];
  /** 没有命中任何关键词时轮流使用 */
  fallbacks: readonly [LLMResponse, ...LLMResponse[]];
}

function reply(emotion: string, action: string, expression: string, text: string): LLMResponse {
  return { emotion, action, expression, text, tool_calls: [] };
}

const GREETING = /(你好|您好|哈喽|哈囉|嗨|hi|hello|在吗|在嗎|早安|晚安|早上好|晚上好)/i;
const DOWN = /(累|难过|難過|伤心|傷心|不开心|不開心|压力|壓力|烦|煩|emo)/i;
const PRAISE = /(喜欢你|喜歡你|可爱|可愛|好看|厉害|厲害)/;
const RUDE = /(讨厌|討厭|笨蛋|滚|滾)/;
const QUESTION = /(什么|什麼|为什么|為什麼|怎么|怎麼|吗|嗎|？|\?)/;

const JIAYIN: MockScript = {
  rules: [
    {
      pattern: GREETING,
      reply: reply(
        'happy',
        'greeting',
        'smile',
        '嗨～你来啦。我刚把今天的功课收尾，正好想找人说说话。',
      ),
    },
    {
      pattern: DOWN,
      reply: reply(
        'sad',
        'nod',
        'frown',
        '辛苦了。先别急着把事情想完，跟我说说发生了什么？我在听。',
      ),
    },
    {
      pattern: PRAISE,
      reply: reply('shy', 'head_tilt', 'blush', '欸……突然这么说，我都不知道该怎么接了啦。'),
    },
    { pattern: RUDE, reply: reply('angry', 'shake', 'frown', '哼，这样说我可是会生气的。') },
    {
      pattern: /(歌|音乐|音樂|唱|编曲|編曲|混音|社团|社團)/,
      reply: reply(
        'happy',
        'nod',
        'smile',
        '说到这个我就来劲了！最近社团在练混音，耳机戴得耳朵都疼，但真的好好玩。',
      ),
    },
    {
      pattern: QUESTION,
      reply: reply(
        'surprised',
        'head_tilt',
        'surprise',
        '嗯？这个问题我得认真想想。等我正式上线，再好好回答你，好不好？',
      ),
    },
  ],
  fallbacks: [
    reply('neutral', 'idle', 'neutral', '嗯嗯，我在听。你接着说？'),
    reply('playful', 'head_tilt', 'smile', '那你猜猜，我现在在干嘛？'),
    reply('happy', 'nod', 'smile', '好呀，这个我记下了。'),
  ],
};

const NUO: MockScript = {
  rules: [
    {
      pattern: GREETING,
      reply: reply('happy', 'greeting', 'smile', '哇～你来啦！阿糯等你好久了嘛～'),
    },
    {
      pattern: DOWN,
      reply: reply('sad', 'nod', 'frown', '抱抱～先喝口热奶茶嘛，不开心的事都可以跟阿糯说哦。'),
    },
    {
      pattern: PRAISE,
      reply: reply('shy', 'head_tilt', 'blush', '欸嘿嘿……被夸了，好不好意思啦～'),
    },
    { pattern: RUDE, reply: reply('angry', 'shake', 'frown', '哼！阿糯要生气了哦！') },
    {
      pattern: /(番|动漫|動漫|奶茶|画画|畫畫|手帐|手帳|饼干|餅乾)/,
      reply: reply('happy', 'nod', 'smile', '这个阿糯超喜欢的！下次我们一起嘛～'),
    },
    {
      pattern: QUESTION,
      reply: reply('surprised', 'head_tilt', 'surprise', '唔……这个问题好难，阿糯要想一想啦～'),
    },
  ],
  fallbacks: [
    reply('neutral', 'idle', 'neutral', '嗯嗯，阿糯在听哦～'),
    reply('playful', 'head_tilt', 'smile', '嘿嘿，你猜阿糯现在在干嘛？'),
    reply('happy', 'nod', 'smile', '好呀好呀～'),
  ],
};

const SCRIPTS: Record<string, MockScript> = {
  lijiaying: JIAYIN,
  yuchengnuo: NUO,
};

/** 没有专属台词的角色使用李佳尹的台词表 */
export function getMockScript(characterId: string | undefined): MockScript {
  return SCRIPTS[characterId ?? DEFAULT_CHARACTER_ID] ?? JIAYIN;
}

/** 输入里带这几个字时，假后端会故意返回一次错误，用来查看出错界面 */
export const MOCK_ERROR_TRIGGER = /(模拟错误|模擬錯誤)/;
