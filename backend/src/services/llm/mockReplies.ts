import type { CharacterId } from '../../characters';
import type { ModelReply } from './types';

/**
 * 演示台词表：还没接真实模型时，Mock 模型（mockAdapter.ts）照这里回复。
 * 每个角色一份：先看用户这句话有没有命中关键词（rules），都没命中就用兜底回复（fallbacks）。
 * 关键词同时接受简体与繁体；emotion / action / expression 的取值见项目规格说明书 3.3。
 */

interface MockScript {
  rules: { pattern: RegExp; reply: ModelReply }[];
  fallbacks: ModelReply[];
}

function reply(emotion: string, action: string, expression: string, text: string): ModelReply {
  return { emotion, action, expression, text };
}

/* ---------- 两个角色共用的关键词 ---------- */

const GREETING = /(你好|您好|哈喽|哈囉|嗨|hi|hello|在吗|在嗎|早安|晚安|早上好|晚上好)/i;
const DOWN = /(累|难过|難過|伤心|傷心|不开心|不開心|压力|壓力|烦|煩|emo)/i;
const PRAISE = /(喜欢你|喜歡你|可爱|可愛|好看|厉害|厲害)/;
const RUDE = /(讨厌|討厭|笨蛋|滚|滾)/;
const QUESTION = /(什么|什麼|为什么|為什麼|怎么|怎麼|吗|嗎|？|\?)/;

/* ---------- 李佳尹 ---------- */

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

/* ---------- 羽澄糯（阿糯） ---------- */

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

const SCRIPTS: Record<CharacterId, MockScript> = {
  lijiaying: JIAYIN,
  yuchengnuo: NUO,
};

/** 按角色与用户这句话挑一条回复；同一句话永远拿到同一条 */
export function pickMockReply(characterId: CharacterId, userText: string): ModelReply {
  const { rules, fallbacks } = SCRIPTS[characterId];
  const rule = rules.find((item) => item.pattern.test(userText));
  return rule?.reply ?? fallbacks[userText.length % fallbacks.length]!;
}

/** 用户的话里带这几个字时，Mock 模型故意失败，用来查看出错提示与重试 */
export const MOCK_ERROR_TRIGGER = /(模拟错误|模擬錯誤)/;
