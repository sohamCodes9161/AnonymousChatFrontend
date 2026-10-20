import { useCallback, useEffect, useRef, useState } from 'react';

// Opus in WebM/Ogg where available (Chrome, Firefox, Android), AAC in MP4
// on Safari/iOS. Low bitrate on purpose: speech is fine at 24 kbps, which
// keeps a 5-minute note around 1 MB.
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
const AUDIO_BITS_PER_SECOND = 24000;
export const MAX_VOICE_SECONDS = 300;

export const isVoiceSupported =
  typeof window !== 'undefined' &&
  typeof MediaRecorder !== 'undefined' &&
  Boolean(navigator.mediaDevices?.getUserMedia);

function pickMime() {
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
}

export function extensionForMime(mime) {
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

export function micErrorMessage(err) {
  if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
    return 'Microphone access is blocked. Allow it in your browser settings to record.';
  }
  if (err?.name === 'NotFoundError') return 'No microphone found';
  return 'Could not start recording';
}

/**
 * status: 'idle' | 'recording'. start() rejects if the mic can't be opened.
 * stop() resolves { blob, duration, mimeType }; cancel() discards.
 * The mic is always released (the browser's recording indicator goes off).
 */
export function useVoiceRecorder({ onLimit } = {}) {
  const onLimitRef = useRef(onLimit);
  onLimitRef.current = onLimit;
  const [status, setStatus] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef(null);
  const resolveRef = useRef(null);
  const discardRef = useRef(false);

  const release = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setStatus('idle');
    setElapsed(0);
  }, []);

  const finish = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    streamRef.current = stream;
    const mime = pickMime();
    const recorder = new MediaRecorder(stream, {
      ...(mime ? { mimeType: mime } : {}),
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });
    chunksRef.current = [];
    discardRef.current = false;
    recorder.ondataavailable = (e) => {
      if (e.data?.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const duration = (performance.now() - startedAtRef.current) / 1000;
      const type = recorder.mimeType || mime || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      const resolve = resolveRef.current;
      const discard = discardRef.current;
      resolveRef.current = null;
      release();
      const result = discard ? null : { blob, duration, mimeType: type };
      if (resolve) resolve(result);
      else if (result) onLimitRef.current?.(result); // stopped by the time limit, not by the user
    };
    recorderRef.current = recorder;
    startedAtRef.current = performance.now();
    recorder.start(1000);
    setStatus('recording');
    timerRef.current = setInterval(() => {
      const secs = (performance.now() - startedAtRef.current) / 1000;
      setElapsed(secs);
      if (secs >= MAX_VOICE_SECONDS) finish(); // hit the limit: stop (onstop hands the result to onLimit)
    }, 250);
  }, [finish, release]);

  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        if (!recorderRef.current) return resolve(null);
        resolveRef.current = resolve;
        finish();
      }),
    [finish]
  );

  const cancel = useCallback(() => {
    if (!recorderRef.current) return;
    discardRef.current = true;
    finish();
  }, [finish]);

  useEffect(() => () => {
    discardRef.current = true;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    release();
  }, [release]);

  return { status, elapsed, start, stop, cancel };
}
