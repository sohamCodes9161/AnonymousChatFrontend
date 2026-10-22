import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './useAuth.js';
import { Button } from '../../components/Button.jsx';
import { Input } from '../../components/Input.jsx';
import { AuthShell } from './AuthShell.jsx';
import { ApiError } from '../../api/client.js';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ username, password, displayName: displayName || undefined });
      navigate('/chats');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'AUTH_USERNAME_TAKEN') setError('That username is already taken.');
        else if (err.code === 'VALIDATION_ERROR') setError(err.message);
        else setError('Something went wrong. Please try again.');
      } else {
        setError('Could not reach the server. Check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Chat privately, with friends or incognito."
      footer={
        <>Already have an account?{' '}<Link to="/login" className="text-accent-primary font-medium hover:underline">Log in</Link></>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="username"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            minLength={3}
            maxLength={20}
            required
          />
          <Input
            id="displayName"
            label="Display name (optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />

          {error && (
            <div role="alert" className="text-sm text-status-error bg-statusErrorSubtle rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
    </AuthShell>
  );
}
