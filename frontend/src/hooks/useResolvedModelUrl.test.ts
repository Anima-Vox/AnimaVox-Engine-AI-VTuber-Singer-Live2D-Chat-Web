import { act, cleanup, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Live2dSettingsTab } from '../components/settings/Live2dSettingsTab';
import { DEFAULT_CHARACTER } from '../constants/defaultCharacter';
import { setSetting } from '../db/repositories/settingsRepository';
import { fetchModelManifest } from '../services/live2d/modelManifest';
import { useCharacterStore } from '../stores/characterStore';
import { useLive2dStore } from '../stores/live2dStore';
import { useResolvedModelUrl } from './useResolvedModelUrl';

vi.mock('../services/live2d/modelManifest', () => ({ fetchModelManifest: vi.fn() }));
vi.mock('../db/repositories/settingsRepository', () => ({ setSetting: vi.fn() }));

const initialState = useLive2dStore.getState();
const initialCharacterState = useCharacterStore.getState();

beforeEach(() => {
  vi.mocked(fetchModelManifest).mockReset();
  vi.mocked(setSetting).mockReset().mockResolvedValue(undefined);
  useLive2dStore.setState({ ...initialState, source: 'directory' }, true);
});

afterEach(() => {
  cleanup();
  useLive2dStore.setState(initialState, true);
  useCharacterStore.setState(initialCharacterState, true);
});

describe('Live2dSettingsTab persistence', () => {
  it('角色保存失败时显示可重试错误，不更新舞台或误报成功', async () => {
    vi.mocked(fetchModelManifest).mockResolvedValue([]);
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValue(undefined);
    useCharacterStore.setState({
      character: { ...DEFAULT_CHARACTER, id: 'character', createdAt: '', updatedAt: '' },
      save,
    });
    const settings = render(createElement(Live2dSettingsTab));
    fireEvent.click(settings.getByRole('radio', { name: /先用占位插画/ }));
    fireEvent.click(settings.getByRole('button', { name: '应用' }));

    await waitFor(() =>
      expect(settings.getByRole('alert').textContent).toContain('storage unavailable'),
    );
    expect(useLive2dStore.getState().source).toBe('directory');
    expect(settings.queryByText('✓ 已应用')).toBeNull();
    expect((settings.getByRole('button', { name: '应用' }) as HTMLButtonElement).disabled).toBe(
      false,
    );

    fireEvent.click(settings.getByRole('button', { name: '应用' }));
    await waitFor(() => expect(useLive2dStore.getState().source).toBe('placeholder'));
    expect(settings.queryByRole('alert')).toBeNull();
    expect(settings.getByText('✓ 已应用')).toBeTruthy();
  });
});

describe('useResolvedModelUrl', () => {
  it('初始目录为空时，设置页重新探测会同步更新舞台地址', async () => {
    vi.mocked(fetchModelManifest).mockResolvedValue([]);
    const { result } = renderHook(() => useResolvedModelUrl());
    await waitFor(() => expect(result.current.status).toBe('empty'));
    const settings = render(createElement(Live2dSettingsTab));
    await waitFor(() => expect(fetchModelManifest).toHaveBeenCalledTimes(2));

    vi.mocked(fetchModelManifest).mockResolvedValue(['/models/new/character.model3.json']);
    fireEvent.click(settings.getByRole('button', { name: '重新探测' }));

    await waitFor(() => expect(result.current.url).toBe('/models/new/character.model3.json'));
    expect(settings.getByText('/models/new/character.model3.json')).toBeTruthy();
  });

  it('初始目录为空时，重新加载也会重读清单并发现后来加入的模型', async () => {
    vi.mocked(fetchModelManifest)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['/models/new/character.model3.json']);
    const { result } = renderHook(() => useResolvedModelUrl());
    await waitFor(() => expect(result.current.status).toBe('empty'));

    act(() => useLive2dStore.getState().requestReload());

    await waitFor(() =>
      expect(result.current).toEqual({
        url: '/models/new/character.model3.json',
        status: 'ready',
      }),
    );
    expect(fetchModelManifest).toHaveBeenCalledTimes(2);
  });
});
