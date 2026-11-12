import { createApiClient } from './client';

export { createApiClient, type ApiClient, type ApiClientOptions } from './client';

/** 目前的登录 token（由 stores/authStore 设定）；所有请求都会自动带上 */
let currentToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  currentToken = token;
}

/** 后端回 UNAUTHORIZED 时要做什么（authStore 会设定成「登出并回到登录页」） */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

/** 全应用共用的后端客户端 */
export const api = createApiClient({
  getToken: () => currentToken,
  onUnauthorized: () => unauthorizedHandler?.(),
});
