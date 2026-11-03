import { describe, expect, it } from 'vitest';
import { getEmotionDisplay, normalizeEmotion } from './emotion';

describe('normalizeEmotion', () => {
  it('识别规格书定案的 7 种情绪', () => {
    for (const value of ['happy', 'surprised', 'sad', 'angry', 'shy', 'playful', 'neutral']) {
      expect(normalizeEmotion(value)).toBe(value);
    }
  });

  it('把大小写、空白、简繁体同义词收敛到同一档', () => {
    expect(normalizeEmotion('Happy')).toBe('happy');
    expect(normalizeEmotion(' 害羞 ')).toBe('shy');
    expect(normalizeEmotion('委屈')).toBe('sad');
    expect(normalizeEmotion('開心')).toBe('happy');
    expect(normalizeEmotion('撒嬌')).toBe('playful');
  });

  it('无法识别或缺失时回落到 neutral，而不是抛错', () => {
    expect(normalizeEmotion('模型自创的奇怪情绪')).toBe('neutral');
    expect(normalizeEmotion(undefined)).toBe('neutral');
    expect(normalizeEmotion(null)).toBe('neutral');
    expect(normalizeEmotion('')).toBe('neutral');
  });
});

describe('getEmotionDisplay', () => {
  it('每种情绪都对应一个 emoji 与中文名', () => {
    expect(getEmotionDisplay('happy')).toEqual({ emotion: 'happy', emoji: '😊', label: '开心' });
    expect(getEmotionDisplay('unknown').emoji).toBe('🙂');
  });
});
