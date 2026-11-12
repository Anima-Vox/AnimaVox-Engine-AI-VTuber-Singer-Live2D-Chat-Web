import { UpdateMeRequestSchema, type User } from '@shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { verifyPassword } from '../auth/password';
import { nowOf, parseBody, requireUser, type AppDeps } from '../context';
import { ApiError } from '../errors';
import {
  deleteUser,
  findUserById,
  publicUser,
  renameUser,
  withdrawConsent,
  type StoredUser,
} from '../store';

const DeleteMeRequestSchema = z.object({ password: z.string().min(1) });

export function meRoutes(deps: AppDeps): FastifyPluginAsync {
  const reload = (user: StoredUser): User =>
    publicUser(findUserById(deps.db, user.id) as StoredUser);

  return async (app) => {
    app.get('/api/me', async (request): Promise<User> => publicUser(requireUser(request, deps)));

    /** 改用户名（佳尹与阿糯之后就用新名字称呼） */
    app.patch('/api/me', async (request): Promise<User> => {
      const user = requireUser(request, deps);
      const { username } = parseBody(UpdateMeRequestSchema, request.body);
      renameUser(deps.db, user.id, username);
      return reload(user);
    });

    /** 撤回训练同意：只能撤回，不能再开启；撤回前已训练进模型的部分不受影响 */
    app.post('/api/me/consent/withdraw', async (request): Promise<User> => {
      const user = requireUser(request, deps);
      withdrawConsent(deps.db, user.id, nowOf(deps).toISOString());
      return reload(user);
    });

    /** 删除帐号与全部对话；需要再输入一次密码 */
    app.delete('/api/me', async (request, reply) => {
      const user = requireUser(request, deps);
      const { password } = parseBody(DeleteMeRequestSchema, request.body);
      if (!(await verifyPassword(password, user.passwordHash))) {
        throw new ApiError('API_ERROR', '密码不正确', {
          reason: 'BAD_CREDENTIALS',
          field: 'password',
        });
      }
      deleteUser(deps.db, user.id);
      return reply.code(204).send();
    });
  };
}
