import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testModelConnection } from './modelApi';
import { httpClient } from './httpClient';

vi.mock('./httpClient', () => ({ httpClient: { post: vi.fn() } }));

beforeEach(() => {
  vi.mocked(httpClient.post).mockReset();
  vi.mocked(httpClient.post).mockReturnValue({
    json: async () => ({ ok: true, mode: 'mock', message: '测试服务 Mock 应答' }),
  } as ReturnType<typeof httpClient.post>);
});

describe('格式校验请求', () => {
  it('真实供应商只校验本地格式，不发送密钥或声称后端已验证', async () => {
    const result = await testModelConnection({
      provider: 'custom',
      apiUrl: 'https://example.com/v1',
      apiKey: 'private-test-key',
      modelName: 'test',
      contextWindow: 20,
    });
    expect(httpClient.post).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, mode: 'format-only' });
    expect(result.message).toContain('尚未验证');
  });

  it('Mock 测试请求也不夹带配置中遗留的密钥', async () => {
    await testModelConnection({
      provider: 'mock',
      apiUrl: 'mock://local',
      apiKey: 'private-test-key',
      modelName: 'mock',
      contextWindow: 20,
    });
    expect(httpClient.post).toHaveBeenCalledWith('api/models/test', {
      json: {
        provider: 'mock',
        apiUrl: 'mock://local',
        modelName: 'mock',
        contextWindow: 20,
      },
    });
  });

  it('不接受非 HTTP 地址，也不向该地址发出请求', async () => {
    const result = await testModelConnection({
      provider: 'custom',
      apiUrl: 'ftp://example.com',
      apiKey: '',
      modelName: 'test',
      contextWindow: 20,
    });
    expect(result.ok).toBe(false);
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it('需要 Key 的供应商未填写 Key 时不通过，也不发出请求', async () => {
    const result = await testModelConnection({
      provider: 'deepseek',
      apiUrl: 'https://api.deepseek.com/v1',
      apiKey: '   ',
      modelName: 'deepseek-v4-pro',
      contextWindow: 20,
    });
    expect(result).toMatchObject({ ok: false, mode: 'format-only' });
    expect(result.message).toContain('API Key');
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it('不需要 Key 的本地模型（Ollama）不填 Key 也能通过', async () => {
    const result = await testModelConnection({
      provider: 'ollama',
      apiUrl: 'http://localhost:11434/v1',
      apiKey: '',
      modelName: 'qwen2.5:7b',
      contextWindow: 20,
    });
    expect(result).toMatchObject({ ok: true, mode: 'format-only' });
    expect(httpClient.post).not.toHaveBeenCalled();
  });
});
