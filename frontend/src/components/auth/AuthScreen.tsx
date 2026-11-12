import { EmailSchema, PasswordSchema, UsernameSchema } from '@shared';
import clsx from 'clsx';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import logoUrl from '../../assets/brand/animavox-vertical-on-dark.svg';
import { useT } from '../../i18n';
import { useAuthStore, type AuthStatus } from '../../stores/authStore';
import { authErrorText } from './authErrors';
import { ConsentNotice } from './ConsentNotice';

type Tab = 'login' | 'register';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string, hintId: string | undefined) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.85rem] text-haze">
        {label}
      </label>
      {children(id, hintId)}
      {hint && (
        <p id={hintId} className="text-[0.75rem] text-haze/80">
          {hint}
        </p>
      )}
    </div>
  );
}

const INPUT =
  'w-full rounded-xl border border-mist-deep bg-white px-4 py-2.5 text-[0.95rem] text-ink outline-none transition-shadow placeholder:text-haze/60 focus:border-signal/50 focus:ring-4 focus:ring-signal/10';
const PRIMARY =
  'rounded-full bg-ink px-5 py-2.5 text-[0.9rem] text-white transition-colors hover:bg-night-raised disabled:cursor-not-allowed disabled:opacity-40';

function ErrorLine({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="rounded-xl bg-alert-soft px-4 py-2.5 text-[0.85rem] text-alert">
      {text}
    </p>
  ) : null;
}

function LoginForm() {
  const t = useT();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (cause) {
      setError(authErrorText(cause, t));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <Field label={t.auth.email}>
        {(id) => (
          <input
            id={id}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={INPUT}
          />
        )}
      </Field>
      <Field label={t.auth.password}>
        {(id) => (
          <input
            id={id}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={INPUT}
          />
        )}
      </Field>
      <ErrorLine text={error} />
      <button type="submit" disabled={busy} className={PRIMARY}>
        {busy ? t.auth.working : t.auth.login}
      </button>
    </form>
  );
}

function RegisterForm() {
  const t = useT();
  const requestEmailCode = useAuthStore((state) => state.requestEmailCode);
  const register = useAuthStore((state) => state.register);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<'form' | 'notice'>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentInfo, setSentInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSendCode() {
    setError(null);
    if (!EmailSchema.safeParse(email).success) {
      setError(t.auth.errors.email);
      return;
    }
    setBusy(true);
    try {
      const result = await requestEmailCode(email.trim());
      setCooldown(result.resendAfterSeconds);
      setSentInfo(
        result.devCode ? `${t.auth.codeSent} ${t.auth.devCode(result.devCode)}` : t.auth.codeSent,
      );
    } catch (cause) {
      setError(authErrorText(cause, t));
    } finally {
      setBusy(false);
    }
  }

  function handleNext(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!EmailSchema.safeParse(email).success) {
      setError(t.auth.errors.email);
    } else if (!/^\d{6}$/.test(code.trim())) {
      setError(t.auth.errors.code);
    } else if (!PasswordSchema.safeParse(password).success) {
      setError(t.auth.errors.password);
    } else if (!UsernameSchema.safeParse(username).success) {
      setError(t.auth.errors.username);
    } else {
      setStep('notice');
    }
  }

  async function handleChoose(trainingConsent: boolean) {
    setBusy(true);
    setError(null);
    try {
      await register({
        email: email.trim(),
        code: code.trim(),
        password,
        username: username.trim(),
        trainingConsent,
      });
    } catch (cause) {
      // 回到表单让用户修正（例如验证码过期）
      setError(authErrorText(cause, t));
      setStep('form');
      setBusy(false);
    }
  }

  if (step === 'notice') {
    return (
      <ConsentNotice
        busy={busy}
        onBack={() => setStep('form')}
        onChoose={(value) => void handleChoose(value)}
      />
    );
  }

  return (
    <form onSubmit={handleNext} className="flex flex-col gap-4">
      <Field label={t.auth.email} hint={t.auth.emailHint}>
        {(id, hintId) => (
          <input
            id={id}
            type="email"
            autoComplete="email"
            aria-describedby={hintId}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={INPUT}
          />
        )}
      </Field>
      <Field label={t.auth.code}>
        {(id) => (
          <div className="flex gap-2">
            <input
              id={id}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={clsx(INPUT, 'min-w-0 flex-1')}
            />
            <button
              type="button"
              onClick={() => void handleSendCode()}
              disabled={busy || cooldown > 0}
              className="shrink-0 rounded-xl bg-signal-soft px-4 text-[0.85rem] text-signal-deep transition-colors hover:bg-signal hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-signal-soft disabled:hover:text-signal-deep"
            >
              {cooldown > 0 ? t.auth.resendIn(cooldown) : t.auth.sendCode}
            </button>
          </div>
        )}
      </Field>
      {sentInfo && (
        <p role="status" className="-mt-2 text-[0.8rem] text-signal-deep">
          {sentInfo}
        </p>
      )}
      <Field label={t.auth.password} hint={t.auth.passwordHint}>
        {(id, hintId) => (
          <input
            id={id}
            type="password"
            autoComplete="new-password"
            aria-describedby={hintId}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={INPUT}
          />
        )}
      </Field>
      <Field label={t.auth.username} hint={t.auth.usernameHint}>
        {(id, hintId) => (
          <input
            id={id}
            autoComplete="nickname"
            aria-describedby={hintId}
            maxLength={20}
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={INPUT}
          />
        )}
      </Field>
      <ErrorLine text={error} />
      <button type="submit" disabled={busy} className={PRIMARY}>
        {t.auth.next}
      </button>
    </form>
  );
}

/** 接后端（http）时的登录 / 注册页；确认登录状态期间只显示一行提示 */
export function AuthScreen({ status }: { status: AuthStatus }) {
  const t = useT().auth;
  const [tab, setTab] = useState<Tab>('login');

  return (
    <div className="grid min-h-full place-items-center overflow-y-auto bg-mist px-4 py-10">
      <div className="w-full max-w-[27rem] overflow-hidden rounded-[1.25rem] border border-night bg-white">
        <div className="flex flex-col items-center gap-3 bg-night px-6 pb-6 pt-7 text-center">
          <img
            src={logoUrl}
            alt="AnimaVox 心音"
            draggable={false}
            className="w-[5.5rem] select-none"
          />
          <div>
            <h1 className="text-[1.15rem] font-medium text-white">{t.title}</h1>
            <p className="mt-1 text-[0.85rem] text-night-muted">{t.subtitle}</p>
          </div>
        </div>

        {status === 'checking' ? (
          <p role="status" className="px-7 py-10 text-center text-[0.9rem] text-haze">
            {t.checking}
          </p>
        ) : (
          <div className="flex flex-col gap-5 px-7 pb-7 pt-5">
            <div role="tablist" className="grid grid-cols-2 gap-1 rounded-full bg-mist p-1">
              {(['login', 'register'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={clsx(
                    'rounded-full py-2 text-[0.9rem] transition-colors',
                    tab === value ? 'bg-white text-ink shadow-sm' : 'text-haze hover:text-ink',
                  )}
                >
                  {value === 'login' ? t.tabLogin : t.tabRegister}
                </button>
              ))}
            </div>
            {tab === 'login' ? <LoginForm /> : <RegisterForm />}
          </div>
        )}
      </div>
    </div>
  );
}
