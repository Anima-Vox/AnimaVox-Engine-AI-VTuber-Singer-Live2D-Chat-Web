import type { Messages } from '../../i18n/messages/zh-CN';
import { ChatTransportError } from '../../services/chat';

type AuthFieldKey = 'email' | 'password' | 'username' | 'code';

/** 把登录、注册的失败转成界面文字（表单错误优先显示细分原因与栏位） */
export function authErrorText(error: unknown, t: Messages): string {
  if (!(error instanceof ChatTransportError)) {
    return t.notice.reasons.unknown;
  }
  if (error.reason && error.reason !== 'INVALID_INPUT') {
    return t.auth.errors[error.reason];
  }
  if (error.reason === 'INVALID_INPUT') {
    const field = error.field as AuthFieldKey | undefined;
    return field && field in t.auth.errors ? t.auth.errors[field] : t.auth.errors.INVALID_INPUT;
  }
  if (error.code === 'http') {
    return t.notice.server(error.status, error.detail);
  }
  return t.notice.reasons[error.code];
}
