import { useMutation } from '@tanstack/react-query';
import { updateProfile, uploadAvatar } from '../../api/users.js';
import { useAuthStore } from '../../stores/authStore.js';

// getState() rather than a hook-level selector — these run inside
// onSuccess, after the mutation resolves, so a fresh non-reactive read
// is actually more correct than whatever was destructured when the
// hook was first called.
export function useUpdateProfile() {
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (res) => {
      const { accessToken, setSession } = useAuthStore.getState();
      setSession(accessToken, res.data.user);
    },
  });
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (res) => {
      const { accessToken, setSession } = useAuthStore.getState();
      setSession(accessToken, res.data.user);
    },
  });
}
