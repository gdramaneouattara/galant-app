import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, rtdb, COLLECTIONS, fbStorage } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { apiRequest } from '@shared/lib/api';
import { Send, ChevronLeft, ShieldCheck, Gem, Sparkles, Languages, Loader2, MapPin, Calendar, Image as ImageIcon, Video, Paperclip } from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';
import { compressImageWeb } from '../lib/imageCompression';
import { CHAT_VIDEO_MAX_DURATION_SECONDS, compressVideoWeb, validateVideoFileWeb, VIDEO_UPLOAD_MAX_BYTES } from '../lib/videoOptimization';
import { ref as storageRef, uploadBytes, getDownloadURL as getStorageUrl } from 'firebase/storage';

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
  const [generating, setGenerating] = useState(false);
  const [targetPresence, setTargetPresence] = useState<{ state?: string; last_changed?: number | string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

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
  }, [chatMessages]);

  const handleAiAssist = async () => {
    if (!profile?.is_premium) {
      showAlert('Premium Requis', t('ai_assistant_exclusive'));
      navigate('/premium');
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
      showAlert('Erreur', 'Échec de la traduction.');
    } finally {
      setTranslatingIds(prev => {
        const next = new Set(prev);
        next.delete(msg.id);
        return next;
      });
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending || !user || !targetUser) return;

    setSending(true);
    try {
      await apiRequest('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          matchId: venueChatId ? undefined : matchId,
          venueChatId: venueChatId || undefined,
          content: inputText.trim(),
          messageType: 'TEXT',
          recipientId: targetUser.isVenue ? undefined : targetUser.id
        })
      });
      setInputText('');
    } catch (error: any) {
      showAlert('Erreur', error.message);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'VIDEO') => {
    if (!profile?.is_premium) {
      showAlert('Privilège Premium 💎', 'Le partage de médias est réservé aux membres Premium.');
      navigate('/premium');
      return;
    }

    const file = e.target.files?.[0];
    if (!file || !user || !matchId) return;

    setUploading(true);
    try {
      let mediaUrl = '';
      let metadata: Record<string, any> = {};

      if (type === 'IMAGE') {
        const finalFile = await compressImageWeb(file);
        const sRef = storageRef(fbStorage, `chats/${venueChatId || matchId}/${Date.now()}_${file.name}`);
        await uploadBytes(sRef, finalFile, { contentType: 'image/webp' });
        mediaUrl = await getStorageUrl(sRef);
      } else {
        try {
          await validateVideoFileWeb(file, CHAT_VIDEO_MAX_DURATION_SECONDS);
        } catch (error: any) {
          if (error?.message === 'video_too_large') {
            showAlert('Video trop lourde', "La video doit peser moins de 30 Mo avant envoi.");
          } else if (error?.message === 'video_too_long') {
            showAlert('Video trop longue', "Les videos chat sont limitees a 30 secondes.");
          } else {
            showAlert('Erreur', "Impossible de lire cette video.");
          }
          return;
        }

        const optimizedVideo = await compressVideoWeb(file, {
          kind: 'CHAT',
          maxDurationSeconds: CHAT_VIDEO_MAX_DURATION_SECONDS,
        });
        if (optimizedVideo.size > VIDEO_UPLOAD_MAX_BYTES) {
          showAlert('Video trop lourde', "La video reste trop lourde apres optimisation. Essayez une video plus courte.");
          return;
        }

        const formData = new FormData();
        formData.append('type', 'CHAT');
        formData.append('video', optimizedVideo, optimizedVideo.name || 'chat.webm');
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
      }

      await apiRequest('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          matchId: venueChatId ? undefined : matchId,
          venueChatId: venueChatId || undefined,
          messageType: type,
          mediaPath: mediaUrl,
          metadata,
          recipientId: targetUser.isVenue ? undefined : targetUser.id
        })
      });
    } catch (error: any) {
      showAlert('Erreur Upload', error.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (!targetUser) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200 dark:shadow-none border border-slate-100 dark:border-white/10 flex flex-col h-[80vh] overflow-hidden">
      {/* Header du Chat */}
      <div className="p-4 border-b border-slate-50 dark:border-white/5 flex items-center gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={() => navigate('/matches')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 dark:text-slate-500">
          <ChevronLeft size={24} />
        </button>
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 dark:border-white/10 cursor-pointer" onClick={() => !targetUser.isVenue && navigate(`/profile/${targetUser.id}`)}>
          <img src={targetUser.photos?.[0]} className="w-full h-full object-cover" alt="" />
        </div>
        <div className="flex-1 cursor-pointer" onClick={() => !targetUser.isVenue && navigate(`/profile/${targetUser.id}`)}>
          <div className="flex items-center gap-1">
            <span className="font-serif italic tracking-tighter text-slate-900 dark:text-white">{targetUser.name}</span>
            {targetUser.is_verified && <ShieldCheck size={14} className="text-blue-500" />}
            {(targetUser.galanterie_score || 0) >= 4.5 && <Gem size={14} className="text-rose-600" />}
          </div>
          <span className={`text-[10px] font-medium uppercase tracking-prestige ${targetPresence?.state === 'online' ? 'text-green-500' : 'text-slate-400 dark:text-slate-500'}`}>
            {targetUser.isVenue ? targetUser.presenceLabel : targetPresence?.state === 'online' ? 'En ligne' : 'Hors ligne'}
          </span>
        </div>
      </div>

      {/* Zone des Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-950/30">
        <div className="bg-slate-100/50 dark:bg-slate-800/50 p-4 rounded-3xl text-center border border-slate-200/50 dark:border-white/5 mb-4">
           <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige flex items-center justify-center gap-2">
             <ShieldCheck size={14} /> Sécurité Galant : Les médias sont effacés tous les 15 jours
           </p>
        </div>

        {chatMessages.map((msg) => {
          const isMine = msg.sender_id === user?.uid;
          const isVenue = msg.message_type === 'VENUE_SUGGESTION';
          const isEvent = msg.message_type === 'EVENT_SUGGESTION';

          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] group relative ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>

                {/* Bulle Standard */}
                <div className={`p-4 rounded-3xl text-sm font-medium shadow-sm overflow-hidden ${
                  isMine
                    ? 'bg-primary text-white rounded-tr-none'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-white/10 rounded-tl-none'
                }`}>

                  {/* Media Content */}
                  {msg.message_type === 'IMAGE' && msg.media_url && (
                    <img
                      src={msg.media_url}
                      className="max-w-full rounded-2xl mb-2 hover:scale-[1.02] transition-transform cursor-pointer"
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
                      className="max-w-full rounded-2xl mb-2 bg-black"
                    />
                  )}

                  {/* Suggestions Lieux/Events */}
                  {(isVenue || isEvent) && (
                    <div className="mb-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white">
                      <p className="text-[10px] font-medium uppercase tracking-prestige text-slate-400 dark:text-slate-500 mb-2">
                        {isMine ? 'Ma suggestion' : 'Proposition de sortie'}
                      </p>
                      <div className="flex items-center gap-3">
                        <img
                          src={isVenue ? msg.metadata?.venue?.photo_url : msg.metadata?.event?.photo_url}
                          className="w-12 h-12 rounded-xl object-cover"
                          alt=""
                        />
                        <div className="min-w-0">
                          <p className="font-bold truncate text-xs">{isVenue ? msg.metadata?.venue?.name : msg.metadata?.event?.title}</p>
                          <p className="text-[10px] text-primary font-bold">
                            {isVenue ? `🎁 ${msg.metadata?.venue?.benefit_description}` : `📅 ${msg.metadata?.event?.venues?.name}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <p>{translations[msg.id] || msg.content}</p>

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
                  {isMine && ` • ${msg.is_read ? 'Lu' : 'Envoyé'}`}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input de Message */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-white/5">
        {inputText === '' && (
          <button
            onClick={handleAiAssist}
            disabled={generating}
            className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-prestige text-secondary bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {t('ai_nudge')}
          </button>
        )}

        <form onSubmit={handleSend} className="flex gap-2 items-center w-full">
          <div className="flex gap-0.5 flex-shrink-0">
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
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'IMAGE')} />
            <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={(e) => handleFileUpload(e, 'VIDEO')} />
          </div>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={uploading}
            placeholder={uploading ? "Envoi..." : t('write_message')}
            className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800 border-none px-4 py-3 md:py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium disabled:opacity-50 text-sm md:text-base text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={(!inputText.trim() && !uploading) || sending || uploading}
            className="w-11 h-11 bg-primary text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-200 disabled:opacity-30 flex-shrink-0 z-10"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={20} fill="white" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
