import { vi } from 'vitest';

/** 假后端收到的一次请求 */
export interface SeenRequest {
  /** 例：'POST /api/chat' */
  route: string;
  url: string;
  authorization: string | null;
  /** 送来的 JSON；没有内容时为 null */
  body: unknown;
}

/** 回一个 JSON 响应 */
export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * 测试用的假后端：把浏览器的 fetch 换掉，按「方法 + 路径」回应，并记下收到的每个请求。
 * 没列出的路径一律当成连不上（fetch 失败）。
 */
export function fakeBackend(routes: Record<string, (request: SeenRequest) => Response>) {
  const seen: SeenRequest[] = [];
  vi.stubGlobal('fetch', async (request: Request) => {
    const url = new URL(request.url);
    const text = await request.text();
    const item: SeenRequest = {
      route: `${request.method} ${url.pathname}`,
      url: request.url,
      authorization: request.headers.get('Authorization'),
      body: text ? JSON.parse(text) : null,
    };
    seen.push(item);
    const handler = routes[item.route];
    if (!handler) {
      throw new TypeError('fetch failed');
    }
    return handler(item);
  });
  return seen;
}
