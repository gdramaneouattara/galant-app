import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, rtdb, COLLECTIONS, fbStorage } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { apiRequest } from '@shared/lib/api';
import { Send, ChevronLeft, ShieldCheck, Gem, Sparkles, Languages, Loader2, MapPin, Calendar, Image as ImageIcon, Video, Paperclip, Mic, Square, Trash2, ExternalLink, Check, X, ShieldAlert } from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';
import { compressImageWeb } from '../lib/imageCompression';
import { CHAT_VIDEO_MAX_DURATION_SECONDS, compressVideoWeb, validateVideoFileWeb, VIDEO_UPLOAD_MAX_BYTES } from '../lib/videoOptimization';
import { startRecording, stopRecording } from '../lib/audioRecording';
import { ref as storageRef, uploadBytes, getDownloadURL as getStorageUrl } from 'firebase/storage';
import OptimizedImage from '../components/OptimizedImage';
import VoicePlayer from '../components/VoicePlayer';
import ReportModal from '../components/ReportModal';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';

const MOBILE_TAB_BAR_HEIGHT = 72;
const MOBILE_COMPOSER_GAP = 16;
const VIDEO_MIME_BY_EXTENSION: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  '3gp': 'video/3gpp',
};

const inferVideoMimeType = (file: File | Blob, fallbackName = 'chat.mp4') => {
  if (file.type?.startsWith('video/')) return file.type;
  const name = 'name' in file && file.name ? file.name : fallbackName;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return VIDEO_MIME_BY_EXTENSION[ext] || 'video/mp4';
};

const ensureVideoUploadFile = (file: File | Blob, fallbackName = 'chat.mp4') => {
  const sourceName = 'name' in file && file.name ? file.name : fallbackName;
  const hasExtension = /\.[a-z0-9]{2,5}$/i.test(sourceName);
  const mimeType = inferVideoMimeType(file, sourceName);
  const name = hasExtension ? sourceName : `${sourceName}.mp4`;
  if (file instanceof File && file.type === mimeType && hasExtension) return file;
  return new File([file], name, { type: mimeType });
};

type PendingAttachment = {
  type: 'IMAGE' | 'VIDEO';
  file: File;
  previewUrl: string;
  name: string;
};

const ChatPage: React.FC = () => {
  const { matchId } = useParams();
  const { user, profile, t, language } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const venueChatId = (location.state as any)?.venueChatId || null;
  const [targetUser, setTargetUser] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [generating, setGenerating] = useState(false);
  const [targetPresence, setTargetPresence] = useState<{ state?: string; last_changed?: number | string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [isReportOpen, setIsReportOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [messageBottomPadding, setMessageBottomPadding] = useState(176);

  const clearPendingAttachment = () => {
    setPendingAttachment((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  useEffect(() => () => {
    if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
  }, [pendingAttachment?.previewUrl]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 150) + 'px';
    }
  }, [inputText]);

  useEffect(() => {
    const updateComposerPadding = () => {
      const isDesktop = window.matchMedia('(min-width: 768px)').matches;
      if (isDesktop) {
        setMessageBottomPadding(16);
        return;
      }

      const composerHeight = composerRef.current?.getBoundingClientRect().height || 96;
      setMessageBottomPadding(Math.ceil(composerHeight + MOBILE_TAB_BAR_HEIGHT + MOBILE_COMPOSER_GAP));
    };

    updateComposerPadding();

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateComposerPadding) : null;
    if (composerRef.current && observer) {
      observer.observe(composerRef.current);
    }

    window.addEventListener('resize', updateComposerPadding);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateComposerPadding);
    };
  }, []);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<any>(null);
  const VOICE_MAX_DURATION_SECONDS = 30;
  const VOICE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const formatRecDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!matchId || !user) return;

    const fetchMatchInfo = async () => {
      if (venueChatId) {
        const venueName = (location.state as any)?.venueName || 'Etablissement partenaire';
        setTargetUser({
          id: venueChatId,
          name: venueName,
          photos: [(location.state as any)?.venuePhoto || 'https://placehold.co/100x100'],
          isVenue: true,
          presenceLabel: (location.state as any)?.presenceLabel || 'Partenaire Galant'
        });
        return;
      }

      const matchDoc = await getDoc(doc(db, COLLECTIONS.MATCHES, matchId));
      if (matchDoc.exists()) {
        const data = matchDoc.data();
        const otherId = data.user_one_id === user.uid ? data.user_two_id : data.user_one_id;
        const userDoc = await getDoc(doc(db, COLLECTIONS.PROFILES, otherId));
        if (userDoc.exists()) {
          setTargetUser({ id: userDoc.id, ...userDoc.data() });
        }
      }
    };
    fetchMatchInfo();

    const msgRef = ref(rtdb, venueChatId ? `venue_messages/${venueChatId}` : `messages/${matchId}`);
    const unsub = onValue(msgRef, (snapshot) => {
      if (snapshot.exists()) {
        const msgs = Object.entries(snapshot.val()).map(([id, data]: any) => ({
          id,
          ...data
        }));
        setChatMessages(msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      } else {
        setChatMessages([]);
      }
    });

    return () => unsub();
  }, [matchId, user, venueChatId, location.state]);

  useEffect(() => {
    if (!matchId || !user || venueChatId) return;
    apiRequest('/api/messages/mark-read', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({ matchId }),
    }).catch(() => {});
  }, [matchId, user, chatMessages.length, venueChatId]);

  useEffect(() => {
    if (!targetUser?.id || targetUser?.isVenue) {
      setTargetPresence(null);
      return;
    }

    const presenceRef = ref(rtdb, `presence/users/${targetUser.id}`);
    const unsub = onValue(presenceRef, (snapshot) => {
      setTargetPresence(snapshot.exists() ? snapshot.val() : null);
    });
    return () => unsub();
  }, [targetUser?.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, messageBottomPadding]);

  const handleAiAssist = async () => {
    if (!profile?.is_premium) {
      showAlert(t('premium_required'), t('ai_assistant_exclusive'));
      navigate('/store');
      return;
    }

    setGenerating(true);
    try {
      const res = await apiRequest<{ suggestions: string[] }>('/api/ai/writing-assistant', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ type: 'MESSAGE', context: { recipientName: targetUser?.name } })
      });
      if (res.suggestions?.[0]) {
        setInputText(res.suggestions[0]);
      }
    } catch (error) {
      showAlert(t('ai_error'), t('ai_error_desc'));
    } finally {
      setGenerating(false);
    }
  };

  const handleTranslate = async (msg: any) => {
    if (!profile?.is_premium) {
      showAlert(t('premium_join'), t('translation_premium_only'));
      return;
    }

    if (translations[msg.id]) {
      // Toggle
      setTranslations(prev => {
        const next = { ...prev };
        delete next[msg.id];
        return next;
      });
      return;
    }

    const targetLang = String(language || 'fr').toLowerCase().split('-')[0];
    const cachedTranslation = msg.metadata?.translations?.[targetLang];
    if (typeof cachedTranslation === 'string' && cachedTranslation.trim()) {
      setTranslations(prev => ({ ...prev, [msg.id]: cachedTranslation }));
      return;
    }

    setTranslatingIds(prev => new Set(prev).add(msg.id));
    try {
      const res = await apiRequest<{ translatedText: string }>('/api/ai/translate', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          text: msg.content,
          targetLang,
          matchId,
          messageId: msg.id
        })
      });
      setTranslations(prev => ({ ...prev, [msg.id]: res.translatedText }));
    } catch (e) {
      showAlert(t('error'), t('translation_failed'));
    } finally {
      setTranslatingIds(prev => {
        const next = new Set(prev);
        next.delete(msg.id);
        return next;
      });
    }
  };

  const uploadChatMedia = async (file: File, type: 'IMAGE' | 'VIDEO') => {
    let mediaUrl = '';
    let metadata: Record<string, any> = {};

    if (type === 'IMAGE') {
      const finalFile = await compressImageWeb(file);
      const sRef = storageRef(fbStorage, `chats/${venueChatId || matchId}/${Date.now()}_image.webp`);
      await uploadBytes(sRef, finalFile, { contentType: 'image/webp' });
      mediaUrl = await getStorageUrl(sRef);
      return { mediaUrl, metadata };
    }

    try {
      await validateVideoFileWeb(file, CHAT_VIDEO_MAX_DURATION_SECONDS);
    } catch (error: any) {
      if (error?.message === 'video_too_large') {
        showAlert(t('video_too_heavy_title'), t('video_too_heavy'));
      } else if (error?.message === 'video_too_long') {
        showAlert(t('video_too_long_title'), t('video_too_long_chat'));
      } else {
        showAlert(t('error'), t('video_unreadable'));
      }
      error.alreadyShown = true;
      throw error;
    }

    const optimizedVideo = await compressVideoWeb(file, {
      kind: 'CHAT',
      maxDurationSeconds: CHAT_VIDEO_MAX_DURATION_SECONDS,
    });
    if (optimizedVideo.size > VIDEO_UPLOAD_MAX_BYTES) {
      showAlert(t('video_too_heavy_title'), t('video_still_too_heavy'));
      throw new Error('video_too_large');
    }

    const formData = new FormData();
    const uploadVideo = ensureVideoUploadFile(optimizedVideo, file.name || 'chat.mp4');
    formData.append('type', 'CHAT');
    formData.append('video', uploadVideo, uploadVideo.name);
    const res = await apiRequest<{ mediaUrl: string; thumbnailUrl?: string }>('/api/media/upload-video', {
      method: 'POST',
      requireAuth: true,
      body: formData,
    });
    const videoRef = storageRef(fbStorage, `chat-media/${res.mediaUrl}`);
    mediaUrl = await getStorageUrl(videoRef);
    if (res.thumbnailUrl) {
      metadata.thumbnail_url = await getStorageUrl(storageRef(fbStorage, `chat-media/${res.thumbnailUrl}`));
    }
    return { mediaUrl, metadata };
  };

  const requirePremiumMediaAccess = () => {
    if (profile?.is_premium) return true;
    showAlert(t('premium_required'), t('media_premium_only'));
    navigate('/store');
    return false;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !pendingAttachment) || sending || uploading || !user || !targetUser) return;

    setSending(true);
    if (pendingAttachment) setUploading(true);
    try {
      const attachment = pendingAttachment;
      const mediaResult = attachment ? await uploadChatMedia(attachment.file, attachment.type) : null;
      await apiRequest('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          matchId: venueChatId ? undefined : matchId,
          venueChatId: venueChatId || undefined,
          content: inputText.trim(),
          messageType: attachment?.type || 'TEXT',
          mediaPath: mediaResult?.mediaUrl,
          metadata: mediaResult?.metadata || {},
          recipientId: targetUser.isVenue ? undefined : targetUser.id
        })
      });
      setInputText('');
      clearPendingAttachment();
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();
      if (error?.alreadyShown) {
        return;
      } else if (message.includes('video_too_large')) {
        showAlert(t('video_too_heavy_title'), t('video_too_heavy'));
      } else if (message.includes('video_too_long')) {
        showAlert(t('video_too_long_title'), t('video_too_long_chat'));
      } else if (message.includes('invalid_video') || message.includes('video_upload_failed')) {
        showAlert(t('error'), t('video_unreadable'));
      } else {
        showAlert(t('error'), error.message);
      }
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'VIDEO') => {
    if (!requirePremiumMediaAccess()) return;

    const file = e.target.files?.[0];
    if (!file || !user || (!matchId && !venueChatId)) return;
    if (type === 'VIDEO') {
      try {
        await validateVideoFileWeb(file, CHAT_VIDEO_MAX_DURATION_SECONDS);
      } catch (error: any) {
        if (error?.message === 'video_too_large') {
          showAlert(t('video_too_heavy_title'), t('video_too_heavy'));
        } else if (error?.message === 'video_too_long') {
          showAlert(t('video_too_long_title'), t('video_too_long_chat'));
        } else {
          showAlert(t('error'), t('video_unreadable'));
        }
        e.target.value = '';
        return;
      }
    }

    clearPendingAttachment();
    setPendingAttachment({
      type,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name || (type === 'IMAGE' ? 'image' : 'video'),
    });
  };

  const handleVoiceUpload = async (file: Blob) => {
    if (!requirePremiumMediaAccess()) return;

    setUploading(true);
    try {
      const sRef = storageRef(fbStorage, `chats/${venueChatId || matchId}/${Date.now()}_serenade.webm`);
      await uploadBytes(sRef, file, { contentType: file.type || 'audio/webm' });
      const mediaUrl = await getStorageUrl(sRef);

      await apiRequest('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          matchId: venueChatId ? undefined : matchId,
          venueChatId: venueChatId || undefined,
          messageType: 'VOICE',
          mediaPath: mediaUrl,
          metadata: { is_serenade: true },
          recipientId: targetUser.isVenue ? undefined : targetUser.id
        })
      });
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('video_too_large')) {
        showAlert(t('video_too_heavy_title'), t('video_too_heavy'));
      } else if (message.includes('video_too_long')) {
        showAlert(t('video_too_long_title'), t('video_too_long_chat'));
      } else if (message.includes('invalid_video') || message.includes('video_upload_failed')) {
        showAlert(t('error'), t('video_unreadable'));
      } else {
        showAlert(t('upload_error'), error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleStartRec = async () => {
    if (!requirePremiumMediaAccess()) return;

    try {
      const { recorder, stream } = await startRecording();
      setRecorder(recorder);
      setAudioStream(stream);
      setIsRecording(true);
      recorder.start();
    } catch (e: any) {
      if (e.message === 'micro_not_supported') {
        showAlert(t('microphone_required'), t('microphone_required_body'));
      }
    }
  };

  const handleStopRec = async () => {
    if (!recorder || !audioStream) return;
    setIsRecording(false);
    const blob = await stopRecording(recorder, audioStream);
    if (blob.size > VOICE_UPLOAD_MAX_BYTES) {
      showAlert(t('serenade_too_heavy'), t('serenade_too_heavy_body'));
      setRecorder(null);
      setAudioStream(null);
      return;
    }
    if (blob.size > 1000) { // Minimum size to avoid empty rec
      await handleVoiceUpload(blob);
    }
    setRecorder(null);
    setAudioStream(null);
  };

  const handleCancelRec = () => {
    setIsRecording(false);
    if (recorder?.state !== 'inactive') recorder?.stop();
    audioStream?.getTracks().forEach(track => track.stop());
    setRecorder(null);
    setAudioStream(null);
  };

  const openVenueSuggestion = (venue: any) => {
    if (!venue?.id) return;
    navigate(`/venue/${venue.id}`, { state: { venue } });
  };

  const handleVenueOpinion = async (message: string, sourceMessage: any) => {
    if (sending || !user || !targetUser || (!matchId && !venueChatId)) return;
    const sourceMessageId = sourceMessage?.id;
    const venueId = sourceMessage?.metadata?.venue?.id;
    if (!sourceMessageId || !venueId) {
      showAlert(t('error'), 'Cette suggestion de sortie ne peut plus recevoir de reponse.');
      return;
    }
    setSending(true);
    try {
      await apiRequest('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          matchId: venueChatId ? undefined : matchId,
          venueChatId: venueChatId || undefined,
          content: message,
          messageType: 'TEXT',
          recipientId: targetUser.isVenue ? undefined : targetUser.id,
          metadata: {
            reply_kind: 'VENUE_SUGGESTION_OPINION',
            source_message_id: sourceMessageId,
            venue_id: venueId
          }
        })
      });
    } catch (error: any) {
      showAlert(t('error'), error.message);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (isRecording && recordingDuration >= VOICE_MAX_DURATION_SECONDS) {
      void handleStopRec();
    }
  }, [isRecording, recordingDuration]);

  if (!targetUser) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="w-full bg-white dark:bg-slate-900 flex flex-col h-[calc(100vh-73px)] md:h-[calc(100vh-80px)] overflow-hidden">
      {/* Header du Chat */}
      <div className="p-4 border-b border-slate-50 dark:border-white/5 flex items-center gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={() => navigate('/matches')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 dark:text-slate-500">
          <ChevronLeft size={24} />
        </button>
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 dark:border-white/10 cursor-pointer" onClick={() => !targetUser.isVenue && navigate(`/profile/${targetUser.id}`)}>
          <OptimizedImage src={optimizedPhotoUrl(targetUser.photos?.[0], targetUser.photo_variants, 'thumb')} className="w-full h-full object-cover" alt="" eager />
        </div>
        <div className="flex-1 cursor-pointer" onClick={() => !targetUser.isVenue && navigate(`/profile/${targetUser.id}`)}>
          <div className="flex items-center gap-1">
            <span className="font-sans  tracking-tighter text-slate-900 dark:text-white">{targetUser.name}</span>
            {targetUser.is_verified && <ShieldCheck size={14} className="text-blue-500" />}
            {(targetUser.galanterie_score || 0) >= 4.5 && <Gem size={14} className="text-rose-600" />}
          </div>
          <span className={`text-[10px] font-medium uppercase tracking-prestige ${targetPresence?.state === 'online' ? 'text-green-500' : 'text-slate-400 dark:text-slate-500'}`}>
            {targetUser.isVenue ? targetUser.presenceLabel : targetPresence?.state === 'online' ? t('online') : t('offline')}
          </span>
        </div>

        {!targetUser.isVenue && (
          <button
            onClick={() => setIsReportOpen(true)}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors text-slate-300 dark:text-slate-600 hover:text-red-500"
            title="Signaler"
          >
            <ShieldAlert size={20} />
          </button>
        )}
      </div>

      {/* Zone des Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30 dark:bg-slate-950/30"
        style={{ paddingBottom: messageBottomPadding }}
      >
        <div className="bg-slate-100/50 dark:bg-slate-800/50 p-4 rounded-3xl text-center border border-slate-200/50 dark:border-white/5 mb-4">
           <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige flex items-center justify-center gap-2">
              <ShieldCheck size={14} /> {t('media_privacy_note')}
           </p>
        </div>

        {chatMessages.map((msg) => {
          const isMine = msg.sender_id === user?.uid;
          const isVenue = msg.message_type === 'VENUE_SUGGESTION';
          const isEvent = msg.message_type === 'EVENT_SUGGESTION';
          const isVisualMedia = msg.message_type === 'IMAGE' || msg.message_type === 'VIDEO';

          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] group relative ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>

                {/* Bulle Standard */}
                <div className={`overflow-hidden ${
                  isVisualMedia
                    ? `p-1.5 rounded-[1.75rem] border shadow-sm ${
                        isMine
                          ? 'bg-primary/10 border-primary/25 rounded-tr-md'
                          : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-white/10 rounded-tl-md'
                      }`
                    : `p-4 rounded-3xl text-sm font-medium shadow-sm ${
                        isMine
                          ? 'bg-primary text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-white/10 rounded-tl-none'
                      }`
                }`}>

                  {/* Media Content */}
                  {msg.message_type === 'IMAGE' && msg.media_url && (
                    <OptimizedImage
                      src={msg.media_url}
                      className="block w-full max-h-[58vh] rounded-[1.35rem] object-contain bg-slate-100 dark:bg-slate-950 cursor-pointer"
                      alt="Shared media"
                      onClick={() => window.open(msg.media_url, '_blank')}
                    />
                  )}

                  {msg.message_type === 'VIDEO' && msg.media_url && (
                    <video
                      src={msg.media_url}
                      controls
                      preload="none"
                      poster={typeof msg.metadata?.thumbnail_url === 'string' ? msg.metadata.thumbnail_url : undefined}
                      className="block w-full max-h-[58vh] rounded-[1.35rem] bg-black"
                    />
                  )}

                  {msg.message_type === 'VOICE' && msg.media_url && (
                    <VoicePlayer
                      messageId={msg.id}
                      matchId={matchId || null}
                      venueChatId={venueChatId || null}
                      url={msg.media_url}
                      isSerenade={msg.metadata?.is_serenade}
                      isMine={isMine}
                      playedAt={msg.metadata?.played_at}
                    />
                  )}

                  {/* Suggestions Lieux/Events */}
                  {(isVenue || isEvent) && (
                    <div className="mb-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white">
                      <p className="text-[10px] font-medium uppercase tracking-prestige text-slate-400 dark:text-slate-500 mb-2">
                        {isMine ? t('my_suggestion') : t('outing_suggestion')}
                      </p>
                      <button
                        type="button"
                        onClick={() => isVenue ? openVenueSuggestion(msg.metadata?.venue) : undefined}
                        className={`w-full flex items-center gap-3 text-left rounded-xl transition-all ${isVenue ? 'hover:bg-white dark:hover:bg-white/5 cursor-pointer' : ''}`}
                      >
                        <OptimizedImage
                          src={isVenue ? optimizedPhotoUrl(msg.metadata?.venue?.photo_url, msg.metadata?.venue?.photo_variants, 'thumb') : msg.metadata?.event?.photo_url}
                          className="w-12 h-12 rounded-xl object-cover"
                          alt=""
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate text-xs">{isVenue ? msg.metadata?.venue?.name : msg.metadata?.event?.title}</p>
                          <p className="text-[10px] text-primary font-bold">
                            {isVenue ? `🎁 ${msg.metadata?.venue?.benefit_description}` : `📅 ${msg.metadata?.event?.venues?.name}`}
                          </p>
                        </div>
                        {isVenue && <ExternalLink size={14} className="text-slate-300 flex-shrink-0" />}
                      </button>
                      {isVenue && !isMine && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => handleVenueOpinion(`Oui, ${msg.metadata?.venue?.name} me tente. On regarde les détails ?`, msg)}
                            disabled={sending}
                            className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <Check size={12} /> Ça me tente
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVenueOpinion(`Je ne suis pas convaincu(e) par ${msg.metadata?.venue?.name}. On cherche une autre option ?`, msg)}
                            disabled={sending}
                            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <X size={12} /> Autre idée
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVenueOpinion(`Je veux bien, mais dis-moi ce qui te plaît dans ${msg.metadata?.venue?.name}.`, msg)}
                            disabled={sending}
                            className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-primary text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <Send size={12} /> Mon avis
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.content && (
                    <p className={isVisualMedia ? 'px-2 pb-2 pt-2 text-sm font-medium text-slate-900 dark:text-white' : ''}>
                      {translations[msg.id] || msg.content}
                    </p>
                  )}

                  {/* Bouton Traduction */}
                  {!isMine && msg.content && !isVenue && !isEvent && (
                    <button
                      onClick={() => handleTranslate(msg)}
                      className="mt-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-prestige text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-white/10 pt-2 w-full text-left hover:text-primary transition-colors"
                    >
                      {translatingIds.has(msg.id) ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Languages size={10} />
                      )}
                      {translations[msg.id] ? t('show_original') : t('translate')}
                    </button>
                  )}
                </div>

                <div className={`text-[9px] font-bold uppercase tracking-tighter text-slate-400 dark:text-slate-500 px-2`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMine && ` • ${msg.is_read ? t('read_receipt') : t('sent_receipt')}`}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input de Message */}
      <div
        ref={composerRef}
        className="fixed bottom-[72px] left-0 right-0 z-40 shrink-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-white/5 shadow-[0_-18px_40px_rgba(15,23,42,0.12)] dark:shadow-[0_-18px_40px_rgba(0,0,0,0.25)] md:relative md:bottom-auto md:left-auto md:right-auto md:z-auto md:shadow-none"
      >
        {isRecording && (
          <div className="absolute inset-0 bg-white dark:bg-slate-900 z-20 flex items-center justify-between px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-black font-sans  tracking-tighter text-slate-900 dark:text-white">
                {t('vocal_serenade')}... {formatRecDuration(recordingDuration)}
              </span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleCancelRec}
                className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 flex items-center justify-center hover:text-red-500 transition-colors"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={handleStopRec}
                className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-red-200 animate-bounce"
              >
                <Square size={20} fill="white" />
              </button>
            </div>
          </div>
        )}

        {inputText === '' && !isRecording && (
          <button
            onClick={handleAiAssist}
            disabled={generating}
            className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-prestige text-secondary bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {t('ai_nudge')}
          </button>
        )}

        {pendingAttachment && !isRecording && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-slate-800/70 p-2">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-950">
              {pendingAttachment.type === 'IMAGE' ? (
                <img src={pendingAttachment.previewUrl} className="h-full w-full object-cover" alt="" />
              ) : (
                <video src={pendingAttachment.previewUrl} className="h-full w-full object-cover" muted playsInline />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{pendingAttachment.name}</p>
              <p className="text-[10px] font-medium uppercase tracking-prestige text-slate-400 dark:text-slate-500">
                {pendingAttachment.type === 'IMAGE' ? 'Photo prete a envoyer' : 'Video prete a envoyer'}
              </p>
            </div>
            <button
              type="button"
              onClick={clearPendingAttachment}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm transition-colors hover:text-primary dark:bg-slate-900"
              aria-label="Retirer le media"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 items-end w-full">
          <div className="flex gap-0.5 flex-shrink-0 mb-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-400 dark:text-slate-500 transition-colors"
            >
              <ImageIcon size={20} />
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-400 dark:text-slate-500 transition-colors"
            >
              <Video size={20} />
            </button>
            <button
              type="button"
              onClick={handleStartRec}
              disabled={uploading}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-primary transition-colors animate-in zoom-in"
            >
              <Mic size={20} />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleMediaSelect(e, 'IMAGE')} />
            <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={(e) => handleMediaSelect(e, 'VIDEO')} />
          </div>

          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend(e as any);
              }
            }}
            disabled={uploading}
            placeholder={uploading ? "Envoi..." : t('write_message')}
            rows={1}
            className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800 border-none px-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium disabled:opacity-50 text-sm md:text-base text-slate-900 dark:text-white resize-none max-h-[150px] overflow-y-auto no-scrollbar"
          />
          <button
            type="submit"
            disabled={(!inputText.trim() && !pendingAttachment) || sending || uploading}
            className="w-11 h-11 bg-primary text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-200 disabled:opacity-30 flex-shrink-0 z-10 mb-0.5"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={20} fill="white" />}
          </button>
        </form>
      </div>

      {targetUser && !targetUser.isVenue && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          reportedUserId={targetUser.id}
          userName={targetUser.name}
        />
      )}
    </div>
  );
};

export default ChatPage;
