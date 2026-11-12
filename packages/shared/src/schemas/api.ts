import { z } from 'zod';
import { ConversationSchema, MessageSchema } from './conversation';

/**
 * 接口约定 v1（见仓库根目录「接口约定-v1.md」）。
 * 前后端都用这里的 Zod schema 校验请求与响应；改动时两边一起改，并更新文档。
 */

/* ---------- 错误 ---------- */

/**
 * 后端固定只回这几种错误码：
 * - API_ERROR：接口调用失败（请求格式不对、找不到资源、后端自身出错）
 * - MODEL_UNAVAILABLE：模型连接失败或模型忙碌
 * - SERVICE_UNSTABLE：服务器或网络不稳、超时
 * - QUOTA_EXCEEDED：额度用完
 * - UNAUTHORIZED：未登录或登录已过期
 */
export const ApiErrorCodeSchema = z.enum([
  'API_ERROR',
  'MODEL_UNAVAILABLE',
  'SERVICE_UNSTABLE',
  'QUOTA_EXCEEDED',
  'UNAUTHORIZED',
]);

/**
 * API_ERROR 的细分原因（只用于表单提示，例如注册页）。
 * 前端不认得的原因一律当作一般的 API_ERROR。
 */
export const ApiErrorReasonSchema = z.enum([
  'INVALID_INPUT',
  'EMAIL_TAKEN',
  'CODE_INVALID',
  'CODE_TOO_FREQUENT',
  'BAD_CREDENTIALS',
  'NOT_FOUND',
]);

/** 所有错误响应的格式 */
export const ApiErrorBodySchema = z.object({
  code: ApiErrorCodeSchema,
  /** 给开发者看的说明（中文）；界面上的文字由前端按语言决定 */
  message: z.string(),
  /** 用户是否可以直接重试 */
  retryable: z.boolean(),
  reason: ApiErrorReasonSchema.optional(),
  /** 出错的栏位（表单用） */
  field: z.string().optional(),
});

/* ---------- 帐号 ---------- */

/** 用户名：佳尹与阿糯用它称呼用户 */
export const UsernameSchema = z.string().trim().min(1).max(20);
export const EmailSchema = z.string().trim().toLowerCase().email().max(254);
export const PasswordSchema = z.string().min(8).max(128);

/** 注册说明的版本；说明内容改了就加一，用来记录用户看的是哪一版 */
export const NOTICE_VERSION = 1;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  /** 是否同意对话资料用于训练本地模型（注册时选定；之后只能撤回，不能再开启） */
  trainingConsent: z.boolean(),
  /** 注册时看的说明版本 */
  noticeVersion: z.number().int(),
  /** 撤回同意的时间；没撤回为 null */
  consentWithdrawnAt: z.string().nullable(),
  createdAt: z.string(),
});

/** POST /api/auth/email-code：寄注册验证码 */
export const EmailCodeRequestSchema = z.object({ email: EmailSchema });
export const EmailCodeResponseSchema = z.object({
  /** 多少秒后才能再寄一次 */
  resendAfterSeconds: z.number().int(),
  /** 只在开发环境（未接寄信服务）回传，方便测试；正式环境不会有 */
  devCode: z.string().optional(),
});

/** POST /api/auth/register */
export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
  password: PasswordSchema,
  username: UsernameSchema,
  trainingConsent: z.boolean(),
  noticeVersion: z.number().int().positive(),
});

/** POST /api/auth/login */
export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});

/** 注册与登录成功都回这个：之后的请求带 Authorization: Bearer <token> */
export const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});

/** PATCH /api/me */
export const UpdateMeRequestSchema = z.object({ username: UsernameSchema });

/* ---------- 对话 ---------- */

export const CharacterIdSchema = z.string().min(1);

/** POST /api/conversations */
export const CreateConversationRequestSchema = z.object({ characterId: CharacterIdSchema });

export const ConversationListResponseSchema = z.object({
  conversations: z.array(ConversationSchema),
});
export const MessageListResponseSchema = z.object({ messages: z.array(MessageSchema) });

/**
 * POST /api/chat：送出一句话（后端保管对话记录，前端只送新的一句）。
 *
 * clientMessageId 由前端产生，同时就是这条用户消息的 id：
 * - 同一个 id 再送一次，后端不会重复写入；
 * - 已经有回复就直接回传原本的回复；还没有回复（上次失败）就重新产生回复，这就是「重试」。
 *
 * 之后要做流式回复时，同一个路径以 Accept: text/event-stream 区分，这一版只回整句。
 */
export const SendMessageRequestSchema = z.object({
  conversationId: z.string().min(1),
  characterId: CharacterIdSchema,
  clientMessageId: z.string().min(8).max(64),
  content: z.string().trim().min(1).max(4000),
});

export const SendMessageResponseSchema = z.object({
  conversation: ConversationSchema,
  userMessage: MessageSchema,
  reply: MessageSchema,
});

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiErrorReason = z.infer<typeof ApiErrorReasonSchema>;
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
export type User = z.infer<typeof UserSchema>;
export type EmailCodeResponse = z.infer<typeof EmailCodeResponseSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;
export type ConversationListResponse = z.infer<typeof ConversationListResponseSchema>;
export type MessageListResponse = z.infer<typeof MessageListResponseSchema>;
