import { UsernameSchema } from '@shared';
import { useState, type FormEvent } from 'react';
import { useT } from '../../i18n';
import { useAuthStore } from '../../stores/authStore';
import { authErrorText } from '../auth/authErrors';

const SMALL_BUTTON =
  'rounded-full border border-mist-deep px-3.5 py-1.5 text-[0.8rem] text-ink transition-colors hover:bg-mist disabled:opacity-40';

/** 设置里的帐号区块：改用户名、训练授权（可撤回）、登出、删除帐号 */
export function AccountSection() {
  const t = useT();
  const user = useAuthStore((state) => state.user);
  const rename = useAuthStore((state) => state.rename);
  const withdrawConsent = useAuthStore((state) => state.withdrawConsent);
  const logout = useAuthStore((state) => state.logout);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);

  const [username, setUsername] = useState(user?.username ?? '');
  /** 用户名刚保存成功（按钮显示「已保存」） */
  const [saved, setSaved] = useState(false);
  /** 正在等用户再确认一次的操作：撤回训练同意，或删除帐号 */
  const [confirming, setConfirming] = useState<'withdraw' | 'delete' | null>(null);
  /** 删除帐号时输入的密码 */
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return null;
  }
  const a = t.account;

  /** 执行一个帐号操作：期间按钮不能再按，失败时显示原因；回传有没有成功 */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (cause) {
      setError(authErrorText(cause, t));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    if (!UsernameSchema.safeParse(username).success) {
      setError(t.auth.errors.username);
      return;
    }
    if (await run(() => rename(username.trim()))) {
      setSaved(true);
    }
  }

  const trainingText = user.consentWithdrawnAt
    ? a.trainingWithdrawn
    : user.trainingConsent
      ? a.trainingYes
      : a.trainingNo;

  return (
    <section aria-label={a.title} className="mt-6 border-t border-mist-deep px-4 pt-5">
      <h3 className="mb-3 text-[0.95rem] font-medium text-ink">{a.title}</h3>

      {/* 用户名（可改）、邮箱、训练授权（同意的人可以撤回） */}
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-3 text-[0.9rem]">
        <dt className="text-haze">{a.username}</dt>
        <dd>
          <form onSubmit={(event) => void handleRename(event)} className="flex gap-2">
            <input
              aria-label={a.username}
              maxLength={20}
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setSaved(false);
              }}
              className="min-w-0 flex-1 rounded-lg border border-mist-deep px-3 py-1.5 text-ink outline-none focus:border-signal/50 focus:ring-4 focus:ring-signal/10"
            />
            <button type="submit" disabled={busy} className={SMALL_BUTTON}>
              {saved ? a.saved : a.save}
            </button>
          </form>
        </dd>
        <dt className="text-haze">{a.email}</dt>
        <dd className="break-all text-ink">{user.email}</dd>
        <dt className="text-haze">{a.training}</dt>
        <dd className="text-ink">
          {trainingText}
          {user.trainingConsent && confirming !== 'withdraw' && (
            <button
              type="button"
              onClick={() => setConfirming('withdraw')}
              className="ml-3 text-[0.75rem] text-haze underline-offset-4 hover:text-ink hover:underline"
            >
              {a.withdraw}
            </button>
          )}
        </dd>
      </dl>

      {/* 撤回训练同意前再确认一次：撤回后不能再开启 */}
      {confirming === 'withdraw' && (
        <div
          role="alertdialog"
          aria-label={a.withdraw}
          className="mt-4 rounded-xl bg-mist px-4 py-3 text-[0.85rem] text-ink"
        >
          <p>{a.withdrawConfirm}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(withdrawConsent).then((ok) => ok && setConfirming(null))}
              className={SMALL_BUTTON}
            >
              {a.confirmWithdraw}
            </button>
            <button type="button" onClick={() => setConfirming(null)} className={SMALL_BUTTON}>
              {a.cancel}
            </button>
          </div>
        </div>
      )}

      {/* 删除帐号前要再输入一次密码 */}
      {confirming === 'delete' && (
        <form
          aria-label={a.deleteAccount}
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => deleteAccount(password));
          }}
          className="mt-4 rounded-xl bg-alert-soft px-4 py-3 text-[0.85rem] text-alert"
        >
          <label className="flex flex-col gap-2">
            {a.deletePrompt}
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-lg border border-alert/30 bg-white px-3 py-1.5 text-ink outline-none"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={busy || !password}
              className="rounded-full bg-alert px-3.5 py-1.5 text-[0.8rem] text-white disabled:opacity-40"
            >
              {a.confirmDelete}
            </button>
            <button type="button" onClick={() => setConfirming(null)} className={SMALL_BUTTON}>
              {a.cancel}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[0.8rem] text-alert">
          {error}
        </p>
      )}

      {/* 登出、删除帐号 */}
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(logout)}
          className={SMALL_BUTTON}
        >
          {a.logout}
        </button>
        {confirming !== 'delete' && (
          <button
            type="button"
            onClick={() => setConfirming('delete')}
            className="rounded-full px-3.5 py-1.5 text-[0.8rem] text-alert transition-colors hover:bg-alert-soft"
          >
            {a.deleteAccount}
          </button>
        )}
      </div>
    </section>
  );
}
