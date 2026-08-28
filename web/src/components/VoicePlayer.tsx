import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Music, Lock } from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { useAuth } from '../context/AuthContext';

interface VoicePlayerProps {
  messageId: string;
  matchId?: string | null;
  venueChatId?: string | null;
  url: string;
  isSerenade?: boolean;
  isMine?: boolean;
  playedAt?: string | null;
  onPlayed?: () => void;
}

const copy = {
  fr: {
    expired: 'Sérénade déjà écoutée',
    serenade: 'Sérénade vocale',
    playing: 'Lecture...',
    ready: 'Prêt',
    oneListen: 'Écoute unique'
  },
  en: {
    expired: 'Serenade already played',
    serenade: 'Voice serenade',
    playing: 'Playing...',
    ready: 'Ready',
    oneListen: 'One listen only'
  }
};

const waveformHeights = [12, 18, 10, 24, 16, 30, 14, 22, 32, 18, 26, 12, 28, 16, 22, 10, 20, 14];

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

const VoicePlayer: React.FC<VoicePlayerProps> = ({ messageId, matchId, venueChatId, url, isSerenade, isMine, playedAt, onPlayed }) => {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedMarkRef = useRef(false);
  const { language } = useAuth();
  const c = copy[language] || copy.fr;

  const isExpired = isSerenade && !!playedAt && !isMine && !playing;

  const markPlayed = async () => {
    if (!isSerenade || isMine || playedAt || playedMarkRef.current) return;
    playedMarkRef.current = true;
    try {
      await apiRequest(`/api/messages/${messageId}/played`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ matchId, venueChatId })
      });
      onPlayed?.();
    } catch (e) {
      playedMarkRef.current = false;
      console.error('Error marking serenade as played', e);
    }
  };

  const togglePlay = () => {
    if (isExpired) return;
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const nextProgress = Number.isFinite(audio.duration) && audio.duration > 0
        ? (audio.currentTime / audio.duration) * 100
        : 0;
      setProgress(Math.min(100, Math.max(0, nextProgress)));
      if (audio.currentTime >= 1) void markPlayed();
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const onEnded = async () => {
      setPlaying(false);
      setProgress(100);
      void markPlayed();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', () => setPlaying(true));
    audio.addEventListener('pause', () => setPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [isSerenade, isMine, playedAt, messageId, matchId, venueChatId, onPlayed]);

  if (isExpired) {
    return (
      <div className="flex items-center gap-3 p-3 min-w-[230px] rounded-2xl bg-slate-900/10 dark:bg-slate-950/50 border border-slate-200/60 dark:border-white/10 opacity-70">
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
          <Lock size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-prestige text-slate-500 dark:text-slate-300">{c.expired}</p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{c.oneListen}</p>
        </div>
      </div>
    );
  }

  const isSerenadeMine = isSerenade && isMine;
  const cardClasses = isSerenade
    ? isSerenadeMine
      ? 'bg-slate-950/25 border border-white/15 text-white shadow-inner'
      : 'bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-500/25 text-slate-900 dark:text-white'
    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white';
  const playButtonClasses = isSerenade
    ? isSerenadeMine
      ? 'bg-white text-primary shadow-sm hover:scale-105'
      : 'bg-primary text-white shadow-sm hover:scale-105'
    : playing
      ? 'bg-primary text-white scale-95'
      : 'bg-white dark:bg-slate-700 text-primary shadow-sm hover:scale-105';
  const mutedTextClass = isSerenadeMine ? 'text-white/70' : 'text-slate-400 dark:text-slate-500';
  const labelTextClass = isSerenadeMine ? 'text-white/85' : 'text-primary';

  return (
    <div className={`p-4 rounded-3xl ${cardClasses} min-w-[240px] max-w-[330px]`}>
      {isSerenade && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Music size={13} className={labelTextClass} />
            <span className={`text-[10px] font-black uppercase tracking-prestige truncate ${labelTextClass}`}>{c.serenade}</span>
          </div>
          <span className={`text-[10px] font-black tabular-nums ${mutedTextClass}`}>{formatDuration(duration)}</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            playing && !isSerenade ? 'bg-primary text-white scale-95' : playButtonClasses
          }`}
          aria-label={playing ? c.playing : c.ready}
        >
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} className="ml-1" fill="currentColor" />}
        </button>

        <div className="flex-1 space-y-1">
          <div className="flex h-9 items-center gap-1" aria-hidden="true">
            {waveformHeights.map((height, index) => {
              const threshold = ((index + 1) / waveformHeights.length) * 100;
              const isActive = progress >= threshold;
              return (
                <span
                  key={`${height}-${index}`}
                  className={`w-1 rounded-full transition-colors duration-150 ${
                    isSerenadeMine
                      ? isActive ? 'bg-white' : 'bg-white/25'
                      : isActive ? 'bg-primary' : 'bg-slate-200 dark:bg-white/15'
                  }`}
                  style={{ height }}
                />
              );
            })}
          </div>
          <div className={`flex justify-between gap-3 text-[9px] font-bold uppercase tracking-widest ${mutedTextClass}`}>
            <span>{playing ? c.playing : c.ready}</span>
            {isSerenade && !isMine && <span>{c.oneListen}</span>}
          </div>
        </div>
      </div>

      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
    </div>
  );
};

export default VoicePlayer;
