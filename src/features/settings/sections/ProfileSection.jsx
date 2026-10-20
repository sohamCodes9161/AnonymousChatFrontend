import { useState, useRef, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore.js';
import { useUpdateProfile, useUploadAvatar } from '../../profile/useProfile.js';
import { toast } from '../../../stores/toastStore.js';
import { Input } from '../../../components/Input.jsx';
import { Button } from '../../../components/Button.jsx';

export function ProfileSection() {
  const user = useAuthStore((s) => s.user);
  const updateProfileMutation = useUpdateProfile();
  const uploadAvatarMutation = useUploadAvatar();
  const fileInputRef = useRef(null);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [error, setError] = useState(null);

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setBio(user?.bio || '');
  }, [user?.displayName, user?.bio]);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      await uploadAvatarMutation.mutateAsync(file);
    } catch (err) {
      setError(err.message || 'Failed to upload avatar');
    } finally {
      e.target.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await updateProfileMutation.mutateAsync({ displayName: displayName.trim(), bio: bio.trim() });
      toast.success('Profile saved');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }
  }

  const initial = (user?.displayName || '?').charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-20 h-20 rounded-pill bg-accentSubtle text-accent-primary flex items-center justify-center text-2xl font-semibold overflow-hidden group"
          aria-label="Change avatar"
        >
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : initial}
          <div className="absolute inset-0 bg-surface-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-fast flex items-center justify-center">
            <Camera size={20} className="text-white" />
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarChange}
          className="hidden"
        />
        {uploadAvatarMutation.isPending && <span className="text-xs text-text-muted">Uploading…</span>}
        <span className="text-xs text-text-muted">@{user?.username}</span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          required
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Tell people a bit about yourself"
            className="px-3 py-2 rounded-md text-sm bg-surface-elevated text-text-primary border border-border placeholder:text-text-muted resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          />
        </div>
        {error && (
          <div role="alert" className="text-sm text-status-error bg-statusErrorSubtle rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <Button type="submit" disabled={updateProfileMutation.isPending || !displayName.trim()}>
          {updateProfileMutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </div>
  );
}
