import { useState, useEffect } from 'react';
import { Ghost } from 'lucide-react';
import { useIncognitoStatus, useEndIncognito } from './useIncognito.js';
import { Button } from '../../components/Button.jsx';

export function IncognitoBanner({ chatId }) {
  const { data: session } = useIncognitoStatus(chatId);
  const endMutation = useEndIncognito(chatId);
  const [secondsLeft, setSecondsLeft] = useState(null);

  useEffect(() => {
    if (!session?.gracePeriodExpiresAt) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.round((new Date(session.gracePeriodExpiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session?.gracePeriodExpiresAt]);

  if (!session || session.status !== 'active') return null;

  const inGracePeriod = Boolean(session.gracePeriodExpiresAt);

  return (
    <div className="bg-incognitoSubtle border-b border-message-incognito px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-message-incognito font-medium">
        <Ghost size={14} />
        {inGracePeriod
          ? `Ending in ${secondsLeft}s unless someone rejoins`
          : 'Incognito mode — messages will be deleted when this session ends'}
      </div>
      <Button
        variant="ghost"
        className="!text-message-incognito !px-2 !py-1 text-xs"
        onClick={() => endMutation.mutate()}
      >
        End
      </Button>
    </div>
  );
}
