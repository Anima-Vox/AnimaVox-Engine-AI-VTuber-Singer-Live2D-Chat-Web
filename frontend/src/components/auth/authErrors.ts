import type { Messages } from '../../i18n/messages/zh-CN';
import type { RequestError } from '../../services/api/errors';

/** 表单里有专属提示的栏位 */
const FIELDS = ['email', 'password', 'username', 'code'] as const;

/** 把登录、注册、帐号操作的失败转成界面上的文字 */
export function authErrorText(error: unknown, t: Messages): string {
  const { code, reason, field } = error as RequestError;
  // 某个栏位填得不对：显示那个栏位的提示
  const fieldKey = FIELDS.find((item) => item === field);
  if (reason === 'INVALID_INPUT' && fieldKey) {
    return t.auth.errors[fieldKey];
  }
  // 后端给了细分原因（例如邮箱已注册、验证码不对）：显示对应的提示
  if (reason) {
    return t.auth.errors[reason];
  }
  // 其他：和对话区一样按错误分类显示
  return t.notice.reasons[code];
}
