import { useState, type FormEvent } from 'react';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { WolfLogo } from '@/components/WolfLogo';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    if (mode === 'signin') {
      const { error: err } = await signIn(email.trim(), password);
      if (err) setError(err);
    } else {
      const { error: err, needsConfirmation } = await signUp(email.trim(), password);
      if (err) setError(err);
      else if (needsConfirmation) setNotice('Account created. Please check your email to confirm, then sign in.');
      else setNotice('Account created. You are now signed in.');
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <WolfLogo className="h-10" />
          <p className="mt-3 text-neutral-500 tracking-[0.3em] uppercase text-xs">
            Certificate Generator
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h1 className="text-white text-lg font-semibold">
                {mode === 'signin' ? 'Admin Sign In' : 'Create Admin Account'}
              </h1>
              <p className="text-neutral-500 text-sm">
                {mode === 'signin' ? 'Access the dashboard' : 'First time? Register below'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-neutral-400 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@wolfcasa.com"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-3 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-200/60 focus:ring-1 focus:ring-amber-200/40"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-neutral-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-3 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-200/60 focus:ring-1 focus:ring-amber-200/40"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {notice && (
              <p className="text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-lg px-3 py-2">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-amber-200 hover:bg-amber-100 disabled:opacity-60 text-neutral-950 font-semibold rounded-lg py-2.5 transition-colors"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setNotice(null);
            }}
            className="mt-5 w-full text-center text-sm text-neutral-400 hover:text-amber-200 transition-colors"
          >
            {mode === 'signin'
              ? 'No account yet? Create one'
              : 'Already have an account? Sign in'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-600">
          Wolf Casa Certificate Generator
        </p>
      </div>
    </div>
  );
}
