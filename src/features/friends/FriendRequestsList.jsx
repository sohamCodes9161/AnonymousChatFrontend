import { useIncomingRequests, useOutgoingRequests } from './useFriends.js';
import { useAcceptFriendRequest, useRejectFriendRequest, useCancelFriendRequest } from './useFriendActions.js';
import { Button } from '../../components/Button.jsx';

export function FriendRequestsList() {
  const { data: incoming } = useIncomingRequests();
  const { data: outgoing } = useOutgoingRequests();
  const acceptMutation = useAcceptFriendRequest();
  const rejectMutation = useRejectFriendRequest();
  const cancelMutation = useCancelFriendRequest();

  if (!incoming?.length && !outgoing?.length) return null;

  return (
    <div className="flex flex-col gap-4">
      {incoming?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-muted uppercase mb-2">Incoming requests</h3>
          {incoming.map((req) => (
            <div key={req._id} className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm text-text-primary">{req.fromUserId?.displayName}</span>
              <div className="flex gap-1">
                <Button className="!px-2 !py-1 text-xs" onClick={() => acceptMutation.mutate(req._id)}>
                  Accept
                </Button>
                <Button
                  variant="ghost"
                  className="!px-2 !py-1 text-xs"
                  onClick={() => rejectMutation.mutate(req._id)}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {outgoing?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-muted uppercase mb-2">Sent requests</h3>
          {outgoing.map((req) => (
            <div key={req._id} className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm text-text-primary">{req.toUserId?.displayName}</span>
              <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => cancelMutation.mutate(req._id)}>
                Cancel
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
