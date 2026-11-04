import {
  LLM_PROVIDER_LABELS,
  LLM_PROVIDER_PRESETS,
  ModelConfigDraftSchema,
  ModelTestResponseSchema,
  type ModelConfigDraft,
  type ModelTestResponse,
} from '@shared';
import { HTTPError } from 'ky';
import { httpClient } from './httpClient';

/**
 * Mock 配置可请求测试服务；真实供应商当前只做本地格式校验。
 * 需要 Key 的供应商必须填写 Key（只在本机检查是否已填写，不传送）。
 * 正式后端未接入前，不声称验证过后端或供应商连通性。
 */
export async function testModelConnection(draft: ModelConfigDraft): Promise<ModelTestResponse> {
  try {
    const config = ModelConfigDraftSchema.omit({ apiKey: true }).parse(draft);
    if (config.provider !== 'mock') {
      let validUrl = false;
      try {
        const url = new URL(config.apiUrl);
        validUrl = url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        // 无效地址以格式校验失败返回，不发起网络请求。
      }
      const missingKey =
        LLM_PROVIDER_PRESETS[config.provider].requiresApiKey && !draft.apiKey.trim();
      const validFormat = validUrl && config.modelName.trim().length > 0;
      return {
        ok: validFormat && !missingKey,
        mode: 'format-only',
        message: !validFormat
          ? '请填写有效的 http/https API 地址与模型名。'
          : missingKey
            ? `${LLM_PROVIDER_LABELS[config.provider]} 需要填写 API Key`
            : '本地格式校验通过；后端与供应商连接尚未验证。',
      };
    }
    const payload: unknown = await httpClient.post('api/models/test', { json: config }).json();
    return ModelTestResponseSchema.parse(payload);
  } catch (cause) {
    if (cause instanceof HTTPError) {
      throw new Error(
        `请求失败（HTTP ${cause.response.status}）。请检查 VITE_API_URL 指向的测试服务。`,
      );
    }
    throw cause;
  }
}
