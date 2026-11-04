import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelTestResponse } from '@shared';
import { testModelConnection } from '../../services/modelApi';
import { useUiStore } from '../../stores/uiStore';
import { SetupWizard } from './SetupWizard';
import { ModelConfigEditor } from '../settings/ModelConfigEditor';

vi.mock('../../services/modelApi', () => ({ testModelConnection: vi.fn() }));

beforeEach(() => {
  useUiStore.setState({ wizardStep: 0 });
});
afterEach(cleanup);

describe.each(['wizard', 'editor'] as const)('%s 连接测试', (component) => {
  it('草稿改动后忽略旧测试的通过结果', async () => {
    let resolveTest!: (result: ModelTestResponse) => void;
    vi.mocked(testModelConnection).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveTest = resolve;
      }),
    );
    render(
      component === 'wizard' ? (
        <SetupWizard />
      ) : (
        <ModelConfigEditor initial={null} onSubmit={async () => {}} onCancel={() => {}} />
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: '测试连接' }));
    fireEvent.change(screen.getByLabelText('模型名'), { target: { value: 'changed-after-test' } });
    await act(async () => {
      resolveTest({ ok: true, mode: 'mock', message: '旧配置通过' });
    });
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: component === 'wizard' ? '下一步' : '保存并激活',
      }).disabled,
    ).toBe(true);
    expect(screen.queryByText('旧配置通过')).toBeNull();
  });
});
