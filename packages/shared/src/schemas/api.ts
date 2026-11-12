import { z } from 'zod';

/**
 * 接口约定 v1：前端与后端之间传的所有资料格式都在这一个文件里。
 * 文字说明见仓库根目录「接口约定-v1.md」。
 * 前后端都用这里的 Zod schema 校验；改接口时，这个文件、文档、前后端要一起改。
 */

/* ============================================================
 * 一、错误：所有失败都回 { code, message, retryable, reason?, field? }
 * ============================================================ */

/**
 * 后端固定只回这五种错误码：
 * - API_ERROR：接口调用失败（请求格式不对、找不到资料、后端自身出错）
 * - MODEL_UNAVAILABLE：模型连接失败
 * - SERVICE_UNSTABLE：服务器或网络不稳、等模型超时
 * - QUOTA_EXCEEDED：今天的额度用完
 * - UNAUTHORIZED：没登录或登录已过期
 */
export const ApiErrorCodeSchema = z.enum([
  'API_ERROR',
  'MODEL_UNAVAILABLE',
  'SERVICE_UNSTABLE',
  'QUOTA_EXCEEDED',
  'UNAUTHORIZED',
]);

/** API_ERROR 的细分原因，给登录、注册等表单显示对应的提示 */
export const ApiErrorReasonSchema = z.enum([
  'INVALID_INPUT',
  'EMAIL_TAKEN',
  'CODE_INVALID',
  'CODE_TOO_FREQUENT',
  'BAD_CREDENTIALS',
  'NOT_FOUND',
]);

export const ApiErrorBodySchema = z.object({
  code: ApiErrorCodeSchema,
  /** 给开发者看的说明；界面上的文字由前端按语言决定 */
  message: z.string(),
  /** 用户能不能直接重试 */
  retryable: z.boolean(),
  reason: ApiErrorReasonSchema.optional(),
  /** 哪一个栏位出错（表单用） */
  field: z.string().optional(),
});

/* ============================================================
 * 二、帐号：邮箱 + 密码 + 邮箱验证码
 * ============================================================ */

export const EmailSchema = z.string().trim().toLowerCase().email().max(254);
export const PasswordSchema = z.string().min(8).max(128);
/** 用户名：佳尹与阿糯用它称呼用户 */
export const UsernameSchema = z.string().trim().min(1).max(20);

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
  /** 还没接寄信服务时把验证码直接回传，方便测试；正式环境（production）不会有 */
  devCode: z.string().optional(),
});

/** POST /api/auth/register：注册 */
export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  /** 6 位数字验证码 */
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
  password: PasswordSchema,
  username: UsernameSchema,
  trainingConsent: z.boolean(),
  noticeVersion: z.number().int().positive(),
});

/** POST /api/auth/login：登录 */
export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});

/** 注册与登录成功都回这个；之后的请求带 Authorization: Bearer <token> */
export const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});

/** PATCH /api/me：改用户名 */
export const UpdateMeRequestSchema = z.object({ username: UsernameSchema });

/** DELETE /api/me：删除帐号，要再输入一次密码 */
export const DeleteMeRequestSchema = z.object({ password: z.string().min(1).max(128) });

/* ============================================================
 * 三、对话：记录由后端保管，前端只送新的一句
 * ============================================================ */

/** 角色 id：lijiaying（李佳尹）或 yuchengnuo（羽澄糯）；有没有这个角色由后端检查 */
export const CharacterIdSchema = z.string().min(1);

export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  characterId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  /** 以下三项只有角色的回复（assistant）才有，留给 Live2D 与语音使用 */
  emotion: z.string().optional(),
  action: z.string().optional(),
  expression: z.string().optional(),
  createdAt: z.string(),
});

/** GET /api/conversations?characterId=… */
export const ConversationListQuerySchema = z.object({ characterId: CharacterIdSchema });
export const ConversationListResponseSchema = z.object({
  conversations: z.array(ConversationSchema),
});

/** POST /api/conversations：开一个新对话 */
export const CreateConversationRequestSchema = z.object({ characterId: CharacterIdSchema });

/** GET /api/conversations/:id/messages */
export const MessageListResponseSchema = z.object({ messages: z.array(MessageSchema) });

/**
 * POST /api/chat：送出一句话，拿到角色的回复（整句）。
 *
 * clientMessageId 由前端产生，同时就是这条用户消息的 id：
 * - 同一个 id 再送一次，后端不会重复写入；
 * - 已经有回复就回传原本的回复；还没有回复（上次失败）就重新产生，这就是「重试」。
 *
 * 之后要做流式回复时，同一个路径以 Accept: text/event-stream 区分。
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

/* ============================================================
 * 四、TypeScript 类型（由上面的 schema 推导）
 * ============================================================ */

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiErrorReason = z.infer<typeof ApiErrorReasonSchema>;
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
export type User = z.infer<typeof UserSchema>;
export type EmailCodeResponse = z.infer<typeof EmailCodeResponseSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type ConversationListResponse = z.infer<typeof ConversationListResponseSchema>;
export type MessageListResponse = z.infer<typeof MessageListResponseSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;
