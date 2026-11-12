import { DeleteMeRequestSchema, UpdateMeRequestSchema, type User } from '@shared';
import type { FastifyPluginAsync } from 'fastify';
import { verifyPassword } from '../auth/password';
import { parseBody, requireUser, type AppDeps } from '../context';
import { ApiError } from '../errors';
import {
  deleteUser,
  findUserById,
  publicUser,
  renameUser,
  withdrawConsent,
  type StoredUser,
} from '../store';

/** 目前登录的帐号：读资料、改用户名、撤回训练同意、删除帐号（接口约定 v1 第三节） */
export function meRoutes(deps: AppDeps): FastifyPluginAsync {
  const { db } = deps;

  /** 改完之后重新读出最新的资料回给前端 */
  const reload = (id: string): User => publicUser(findUserById(db, id) as StoredUser);

  return async (app) => {
    /* ---------- 读自己的资料（前端打开页面时用它确认登录还有效） ---------- */
    app.get('/api/me', async (request): Promise<User> => publicUser(requireUser(request, deps)));

    /* ---------- 改用户名（角色之后就用新名字称呼） ---------- */
    app.patch('/api/me', async (request): Promise<User> => {
      const user = requireUser(request, deps);
      const { username } = parseBody(UpdateMeRequestSchema, request.body);
      renameUser(db, user.id, username);
      return reload(user.id);
    });

    /* ---------- 撤回训练同意（只能撤回，不能再开启） ---------- */
    app.post('/api/me/consent/withdraw', async (request): Promise<User> => {
      const user = requireUser(request, deps);
      withdrawConsent(db, user.id, new Date().toISOString());
      return reload(user.id);
    });

    /* ---------- 删除帐号与全部对话（要再输入一次密码） ---------- */
    app.delete('/api/me', async (request, reply) => {
      const user = requireUser(request, deps);
      const { password } = parseBody(DeleteMeRequestSchema, request.body);
      if (!(await verifyPassword(password, user.passwordHash))) {
        throw new ApiError('API_ERROR', '密码不正确', {
          reason: 'BAD_CREDENTIALS',
          field: 'password',
        });
      }
      deleteUser(db, user.id);
      return reply.code(204).send();
    });
  };
}
