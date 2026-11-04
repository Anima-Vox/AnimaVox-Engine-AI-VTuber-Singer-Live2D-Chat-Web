import { z } from 'zod';
import { LLM_PROVIDERS } from '../constants';

export const LLMProviderSchema = z.enum(LLM_PROVIDERS);

/**
 * LLM 模型配置（可配置多条，isActive 标记当前在用）
 * 注意：apiKey 在前端为明文（存于用户自己的浏览器），
 * 后端 SQLite 加密存储属于规划，当前 Mock 骨架尚未实现。
 */
export const ModelConfigSchema = z.object({
  id: z.string().min(1),
  provider: LLMProviderSchema,
  apiUrl: z.string().min(1, 'API 地址不能为空'),
  apiKey: z.string().default(''),
  modelName: z.string().min(1, '模型名不能为空'),
  contextWindow: z.number().int().positive().default(20),
  isActive: z.boolean().default(false),
  createdAt: z.string(),
});

export const ModelConfigDraftSchema = ModelConfigSchema.omit({
  id: true,
  createdAt: true,
  isActive: true,
});

/** 当前测试接口只做格式校验，不接收供应商密钥。真实连通测试由正式后端另行实现。 */
export const ModelTestRequestSchema = ModelConfigDraftSchema.omit({ apiKey: true });

/** POST /api/models/test 响应体 */
export const ModelTestResponseSchema = z.object({
  ok: z.boolean(),
  /** mock = 真实跑通了一次对话；format-only = 只做了配置格式与后端连通性校验 */
  mode: z.enum(['mock', 'format-only']),
  message: z.string(),
  latencyMs: z.number().optional(),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type ModelConfigDraft = z.infer<typeof ModelConfigDraftSchema>;
export type ModelTestResponse = z.infer<typeof ModelTestResponseSchema>;
