import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { LOGIN } from '../graphql/operations';
import { LogoMark } from './TopBar';
import { Avatar } from './Avatar';

interface DemoAccount {
  name: string;
  email: string;
  avatarColor: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { name: 'Jenny White', email: 'jenny@gradual.com', avatarColor: '#7FD8BD' },
  { name: 'Devon Lane', email: 'devon@gradual.com', avatarColor: '#F2B8A2' },
  { name: 'Jerry White', email: 'jerry@gradual.com', avatarColor: '#A8B4F8' },
];

const DEMO_PASSWORD = 'password123';

interface LoginPageProps {
  onAuthenticated: (token: string) => void;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [login, { loading }] = useMutation<{ login: { token: string } }>(LOGIN);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const result = await login({ variables: { email, password } });
      const token = result.data?.login.token;
      if (!token) throw new Error('Login did not return a token.');
      onAuthenticated(token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.');
    }
  };

  return (
    <div className="flex h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex items-center gap-3">
          <LogoMark />
          <div>
            <p className="text-[15px] font-semibold">Gradual Community</p>
            <p className="text-[12px] text-muted">Realtime chat · GraphQL · socket.io</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-line bg-panel/90 p-6 shadow-popover backdrop-blur"
        >
          <h1 className="text-[18px] font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-[13px] text-muted">
            Use one of the demo accounts below — no sign-up required.
          </p>

          <label className="mt-5 block text-[12px] font-medium text-muted" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-black/25 px-3 py-2 text-[14px] text-content outline-none transition focus:border-accent/60"
            required
          />

          <label className="mt-4 block text-[12px] font-medium text-muted" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-black/25 px-3 py-2 text-[14px] text-content outline-none transition focus:border-accent/60"
            required
          />

          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-badge/40 bg-badge/10 px-3 py-2 text-[12px] text-badge"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex h-10 w-full items-center justify-center rounded-lg bg-accent text-[14px] font-semibold text-ink transition hover:bg-accent/90 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="mt-6 border-t border-line/70 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted/80">
              Demo accounts
            </p>
            <div className="mt-2 space-y-1">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(DEMO_PASSWORD);
                    setError(null);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition ${
                    email === account.email ? 'bg-white/[0.07]' : 'hover:bg-white/5'
                  }`}
                >
                  <Avatar name={account.name} color={account.avatarColor} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px]">{account.name}</span>
                    <span className="block truncate text-[11px] text-muted">{account.email}</span>
                  </span>
                  {email === account.email ? (
                    <span className="text-[11px] font-semibold text-accent">selected</span>
                  ) : null}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted/70">Password for every demo account: {DEMO_PASSWORD}</p>
          </div>
        </form>

        <p className="mt-4 text-center text-[11px] text-muted/60">
          Tip: open a second browser window and sign in as Devon Lane to see realtime messaging.
        </p>
      </div>
    </div>
  );
}
