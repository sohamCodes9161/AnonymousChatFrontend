import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

// Only one voice note plays at a time.
let currentlyPlaying = null;

function fmt(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const SPEEDS = [1, 1.5, 2];

export function VoicePlayer({ src, duration = 0, mimeType, disabled = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      if (currentlyPlaying === audio) currentlyPlaying = null;
    };
  }, []);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio || disabled) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (mimeType && audio.canPlayType && !audio.canPlayType(mimeType)) {
      setFailed(true);
      return;
    }
    if (currentlyPlaying && currentlyPlaying !== audio) currentlyPlaying.pause();
    currentlyPlaying = audio;
    try {
      await audio.play();
    } catch {
      setFailed(true);
    }
  }

  function seek(e) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const t = (Number(e.target.value) / 100) * duration;
    audio.currentTime = t;
    setCurrent(t);
  }

  function cycleSpeed() {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  }

  const pct = duration ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className="flex items-center gap-2.5 w-56 md:w-64 max-w-full select-none" onClick={(e) => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        className="w-9 h-9 rounded-pill bg-black/10 flex items-center justify-center flex-shrink-0 hover:bg-black/20 active:scale-95 transition disabled:opacity-50"
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <input
          type="range"
          min="0"
          max="100"
          step="0.5"
          value={pct}
          onChange={seek}
          disabled={disabled || failed}
          aria-label="Seek"
          className="w-full h-1 accent-current cursor-pointer"
        />
        <div className="flex items-center justify-between text-[11px] opacity-80 mt-0.5">
          <span>{failed ? "Can't play on this browser" : fmt(playing || current ? current : duration)}</span>
          <button type="button" onClick={cycleSpeed} className="px-1.5 rounded bg-black/15 font-medium" aria-label="Playback speed">
            {SPEEDS[speedIdx]}x
          </button>
        </div>
      </div>
    </div>
  );
}
