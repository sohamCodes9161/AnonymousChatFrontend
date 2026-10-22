import { Check, X } from 'lucide-react';
import { useIncomingRequests, useOutgoingRequests } from './useFriends.js';
import { useAcceptFriendRequest, useRejectFriendRequest, useCancelFriendRequest } from './useFriendActions.js';
import { Avatar } from '../../components/Avatar.jsx';
import { SectionHeader } from './SectionHeader.jsx';

export function FriendRequestsList() {
  const { data: incoming } = useIncomingRequests();
  const { data: outgoing } = useOutgoingRequests();
  const acceptMutation = useAcceptFriendRequest();
  const rejectMutation = useRejectFriendRequest();
  const cancelMutation = useCancelFriendRequest();

  if (!incoming?.length && !outgoing?.length) return null;

  return (
    <div className="flex flex-col gap-5">
      {incoming?.length > 0 && (
        <section>
          <SectionHeader title="Requests" count={incoming.length} highlight />
          <div className="flex flex-col gap-1">
            {incoming.map((req) => {
              const u = req.fromUserId;
              return (
                <div key={req._id} className="flex items-center gap-3 px-2 py-2 rounded-xl bg-accentSubtle">
                  <Avatar name={u?.displayName} src={u?.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-text-primary truncate">{u?.displayName}</div>
                    <div className="text-xs text-text-muted truncate">@{u?.username}</div>
                  </div>
                  <button
                    onClick={() => acceptMutation.mutate(req._id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-accent-primary text-white hover:opacity-90 transition-opacity"
                    aria-label={`Accept request from ${u?.displayName}`}
                    title="Accept"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(req._id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-secondary text-text-secondary hover:text-status-error transition-colors"
                    aria-label={`Reject request from ${u?.displayName}`}
                    title="Reject"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {outgoing?.length > 0 && (
        <section>
          <SectionHeader title="Sent" count={outgoing.length} />
          <div className="flex flex-col gap-1">
            {outgoing.map((req) => {
              const u = req.toUserId;
              return (
                <div key={req._id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface-secondary transition-colors">
                  <Avatar name={u?.displayName} src={u?.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-text-primary truncate">{u?.displayName}</div>
                    <div className="text-xs text-text-muted">Pending</div>
                  </div>
                  <button
                    onClick={() => cancelMutation.mutate(req._id)}
                    className="text-xs px-3 py-1.5 rounded-full bg-surface-secondary text-text-secondary hover:text-status-error transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
