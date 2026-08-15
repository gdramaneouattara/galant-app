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
    expired: 'Serenade expiree',
    serenade: 'Serenade vocale',
    playing: 'Lecture...',
    ready: 'Pret',
    oneListen: 'Ecoute unique'
  },
  en: {
    expired: 'Serenade expired',
    serenade: 'Voice serenade',
    playing: 'Playing...',
    ready: 'Ready',
    oneListen: 'One listen only'
  }
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
      setProgress((audio.currentTime / audio.duration) * 100);
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
      <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl opacity-50">
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400">
          <Lock size={18} />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{c.expired}</p>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-2xl ${isSerenade ? 'bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-500/20' : 'bg-slate-100 dark:bg-slate-800'} min-w-[200px]`}>
      {isSerenade && (
        <div className="flex items-center gap-2 mb-2">
          <Music size={12} className="text-primary" />
          <span className="text-[9px] font-black uppercase tracking-prestige text-primary">{c.serenade}</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            playing ? 'bg-primary text-white scale-95' : 'bg-white dark:bg-slate-700 text-primary shadow-sm hover:scale-105'
          }`}
          aria-label={playing ? c.playing : c.ready}
        >
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} className="ml-1" fill="currentColor" />}
        </button>

        <div className="flex-1 space-y-1">
          <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
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
