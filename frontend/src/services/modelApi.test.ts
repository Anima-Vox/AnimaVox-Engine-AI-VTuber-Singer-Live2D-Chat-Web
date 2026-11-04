import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testModelConnection } from './modelApi';
import { httpClient } from './httpClient';

vi.mock('./httpClient', () => ({ httpClient: { post: vi.fn() } }));

beforeEach(() => {
  vi.mocked(httpClient.post).mockReturnValue({
    json: async () => ({ ok: true, mode: 'format-only', message: '格式有效' }),
  } as ReturnType<typeof httpClient.post>);
});

describe('格式校验请求', () => {
  it('不把本地 API Key 发给只做格式校验的 mock 骨架', async () => {
    await testModelConnection({
      provider: 'custom',
      apiUrl: 'https://example.com/v1',
      apiKey: 'private-test-key',
      modelName: 'test',
      contextWindow: 20,
    });
    expect(httpClient.post).toHaveBeenCalledWith('api/models/test', {
      json: {
        provider: 'custom',
        apiUrl: 'https://example.com/v1',
        modelName: 'test',
        contextWindow: 20,
      },
    });
  });
});
