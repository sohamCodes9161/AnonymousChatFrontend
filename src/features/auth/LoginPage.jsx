import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './useAuth.js';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { Card } from '../../components/Card.jsx';
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
    <div className="h-screen flex items-center justify-center bg-surface-primary px-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-lg font-semibold text-text-primary mb-1">Welcome back</h1>
        <p className="text-sm text-text-secondary mb-6">Log in to your account.</p>

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
            <div role="alert" className="text-sm text-status-error bg-statusErrorSubtle rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>

        <p className="text-sm text-text-secondary mt-4 text-center">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent-primary hover:underline">
            Register
          </Link>
        </p>
      </Card>
    </div>
  );
}
