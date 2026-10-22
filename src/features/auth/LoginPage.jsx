import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './useAuth.js';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { AuthShell } from './AuthShell.jsx';
import { ApiError } from '../../api/client.js';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ username, password });
      navigate('/chats');
    } catch (err) {
      // AUTH_ACCOUNT_LOCKED gets its own message — everything else
      // (including invalid credentials) stays generic, matching the
      // backend's anti-enumeration design.
      if (err instanceof ApiError && err.code === 'AUTH_ACCOUNT_LOCKED') {
        setError('Too many failed attempts. Try again in a few minutes.');
      } else {
        setError('Invalid username or password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue your conversations."
      footer={
        <>Don't have an account?{' '}<Link to="/register" className="text-accent-primary font-medium hover:underline">Register</Link></>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="username"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && (
            <div role="alert" className="text-sm text-status-error bg-statusErrorSubtle rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
    </AuthShell>
  );
}
