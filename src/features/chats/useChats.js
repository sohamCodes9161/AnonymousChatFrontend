import { useQuery } from '@tanstack/react-query';
import { listChats } from '../../api/chats.js';

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: () => listChats().then((res) => res.data.chats),
  });
}
