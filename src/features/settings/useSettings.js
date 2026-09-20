import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '../../api/settings.js';
import { toast } from '../../stores/toastStore.js';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings().then((res) => res.data.settings),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: (res) => {
      queryClient.setQueryData(['settings'], res.data.settings);
    },
    onError: () => toast.error('Failed to update settings'),
  });
}
