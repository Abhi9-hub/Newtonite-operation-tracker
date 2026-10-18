// Login form. Demo accounts are listed so reviewers can switch roles in one click.
import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { ApiError } from '../../api/client';

const DEMO = [
  ['alice@example.com', 'Alice: lead in Payments, member in Platform'],
  ['bob@example.com', 'Bob: member in Payments'],
  ['carol@example.com', 'Carol: viewer in Payments (read-only)'],
  ['dave@example.com', 'Dave: lead in Platform only (no Payments access)'],
];

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('alice@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return; // guard against double submit
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center">
      <form className="card login" onSubmit={submit}>
        <h1>Ops Tracker</h1>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="demo">
          <small>Demo accounts (password: password123)</small>
          {DEMO.map(([em, label]) => (
            <button type="button" key={em} className="link" onClick={() => setEmail(em)}>{label}</button>
          ))}
        </div>
      </form>
    </div>
  );
}