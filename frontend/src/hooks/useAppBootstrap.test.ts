import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getSetting } from '../db/repositories/settingsRepository';
import { useCharacterStore } from '../stores/characterStore';
import { useChatStore } from '../stores/chatStore';
import { useModelStore } from '../stores/modelStore';
import { useUiStore } from '../stores/uiStore';
import { useAppBootstrap } from './useAppBootstrap';

vi.mock('../db/repositories/settingsRepository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../db/repositories/settingsRepository')>()),
  getSetting: vi.fn(),
}));

beforeEach(() => {
  useCharacterStore.setState({ status: 'ready', error: null });
  useModelStore.setState({ status: 'ready', error: null });
  useChatStore.setState({ error: null });
  vi.spyOn(useCharacterStore.getState(), 'load').mockResolvedValue();
  vi.spyOn(useModelStore.getState(), 'load').mockResolvedValue();
  vi.spyOn(useChatStore.getState(), 'load').mockResolvedValue();
  vi.spyOn(useUiStore.getState(), 'hydrate').mockResolvedValue();
});
afterEach(cleanup);

it('启动读取失败时提供错误与重试，不永久停在加载遮罩', async () => {
  vi.mocked(getSetting).mockRejectedValue(new Error('存储被拒绝'));
  const { result } = renderHook(useAppBootstrap);
  await waitFor(() => expect(result.current.error).toBe('存储被拒绝'));
  expect(result.current.ready).toBe(false);
  vi.mocked(getSetting).mockResolvedValue(null);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.error).toBeNull();
});
