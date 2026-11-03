import type { KnownEmotion } from '@shared';

/**
 * 情绪 → emoji。
 * 第一版只用 emoji 显示 emotion；action / expression 原样保存在消息记录里，
 * 等 Phase 2 接 Live2D 时再驱动动作与表情。
 */

export interface EmotionDisplay {
  emotion: KnownEmotion;
  emoji: string;
  /** 中文名：只给屏幕阅读器与鼠标悬停提示使用，界面上不显示 */
  label: string;
}

const DISPLAY: Record<KnownEmotion, EmotionDisplay> = {
  happy: { emotion: 'happy', emoji: '😊', label: '开心' },
  surprised: { emotion: 'surprised', emoji: '😮', label: '惊讶' },
  sad: { emotion: 'sad', emoji: '😢', label: '难过' },
  angry: { emotion: 'angry', emoji: '😠', label: '生气' },
  shy: { emotion: 'shy', emoji: '😳', label: '害羞' },
  playful: { emotion: 'playful', emoji: '😜', label: '撒娇' },
  neutral: { emotion: 'neutral', emoji: '🙂', label: '平静' },
};

/** 同义词表（英文 / 简体 / 繁体），把模型返回的任意写法收敛到 7 种情绪 */
const SYNONYMS: Record<string, KnownEmotion> = {
  happy: 'happy',
  joy: 'happy',
  joyful: 'happy',
  glad: 'happy',
  excited: 'happy',
  cheerful: 'happy',
  开心: 'happy',
  開心: 'happy',
  高兴: 'happy',
  高興: 'happy',
  快乐: 'happy',
  快樂: 'happy',
  兴奋: 'happy',
  興奮: 'happy',

  surprised: 'surprised',
  surprise: 'surprised',
  shocked: 'surprised',
  amazed: 'surprised',
  惊讶: 'surprised',
  驚訝: 'surprised',
  吃惊: 'surprised',
  吃驚: 'surprised',

  sad: 'sad',
  sorrow: 'sad',
  upset: 'sad',
  lonely: 'sad',
  难过: 'sad',
  難過: 'sad',
  伤心: 'sad',
  傷心: 'sad',
  委屈: 'sad',
  失落: 'sad',

  angry: 'angry',
  mad: 'angry',
  annoyed: 'angry',
  生气: 'angry',
  生氣: 'angry',
  愤怒: 'angry',
  憤怒: 'angry',

  shy: 'shy',
  bashful: 'shy',
  embarrassed: 'shy',
  blush: 'shy',
  害羞: 'shy',

  playful: 'playful',
  mischievous: 'playful',
  撒娇: 'playful',
  撒嬌: 'playful',
  俏皮: 'playful',

  neutral: 'neutral',
  calm: 'neutral',
  normal: 'neutral',
  idle: 'neutral',
  平静: 'neutral',
  平靜: 'neutral',
};

/** 未识别或缺失的值一律回落到 neutral，界面永远不会因为脏字段崩掉 */
export function normalizeEmotion(raw: string | null | undefined): KnownEmotion {
  if (!raw) {
    return 'neutral';
  }
  const trimmed = raw.trim();
  return SYNONYMS[trimmed.toLowerCase()] ?? SYNONYMS[trimmed] ?? 'neutral';
}

export function getEmotionDisplay(raw: string | null | undefined): EmotionDisplay {
  return DISPLAY[normalizeEmotion(raw)];
}
