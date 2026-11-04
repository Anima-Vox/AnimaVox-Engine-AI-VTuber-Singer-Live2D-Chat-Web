import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHARACTER } from '../constants/defaultCharacter';
import { saveCharacter } from '../db/repositories/characterRepository';
import { useCharacterStore } from './characterStore';

vi.mock('../db/repositories/characterRepository', () => ({
  ensureDefaultCharacter: vi.fn(),
  saveCharacter: vi.fn(),
}));

beforeEach(() => {
  useCharacterStore.setState({
    character: {
      ...DEFAULT_CHARACTER,
      id: 'character',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    error: null,
  });
});

describe('角色保存错误', () => {
  it('向调用方报告写入失败，不让表单显示成功', async () => {
    vi.mocked(saveCharacter).mockRejectedValueOnce(new Error('存储不可用'));
    await expect(useCharacterStore.getState().save(DEFAULT_CHARACTER)).rejects.toMatchObject({
      message: '存储不可用',
    });
    expect(useCharacterStore.getState().error).toBe('存储不可用');
  });

  it('角色未初始化时也拒绝保存', async () => {
    useCharacterStore.setState({ character: null });
    await expect(useCharacterStore.getState().save(DEFAULT_CHARACTER)).rejects.toMatchObject({
      message: '角色尚未初始化',
    });
  });
});
