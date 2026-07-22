import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, rtdb, COLLECTIONS, fbStorage } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { apiRequest } from '@shared/lib/api';
import { Send, ChevronLeft, ShieldCheck, Gem, Sparkles, Languages, Loader2, MapPin, Calendar, Image as ImageIcon, Video, Paperclip } from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';
import { compressImageWeb } from '../lib/imageCompression';
import { ref as storageRef, uploadBytes, getDownloadURL as getStorageUrl } from 'firebase/storage';

const ChatPage: React.FC = () => {
  const { matchId } = useParams();
  const { user, profile, t, language } = useAuth();
  const navigate = useNavigate();
  const [targetUser, setTargetUser] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchId || !user) return;

    const fetchMatchInfo = async () => {
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

    const msgRef = ref(rtdb, `messages/${matchId}`);
    const unsub = onValue(msgRef, (snapshot) => {
      if (snapshot.exists()) {
        const msgs = Object.entries(snapshot.val()).map(([id, data]: any) => ({
          id,
          ...data
        }));
        setChatMessages(msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      }
    });

    return () => unsub();
  }, [matchId, user]);

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

  const handleTranslate = async (msgId: string, content: string) => {
    if (!profile?.is_premium) {
      showAlert(t('premium_join'), t('translation_premium_only'));
      return;
    }

    if (translations[msgId]) {
      // Toggle
      setTranslations(prev => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
      return;
    }

    setTranslatingIds(prev => new Set(prev).add(msgId));
    try {
      const res = await apiRequest<{ translatedText: string }>('/api/ai/translate', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ text: content, targetLang: language })
      });
      setTranslations(prev => ({ ...prev, [msgId]: res.translatedText }));
    } catch (e) {
      showAlert('Erreur', 'Échec de la traduction.');
    } finally {
      setTranslatingIds(prev => {
        const next = new Set(prev);
        next.delete(msgId);
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
          matchId,
          content: inputText.trim(),
          messageType: 'TEXT',
          recipientId: targetUser.id
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
      let finalFile: Blob | File = file;
      if (type === 'IMAGE') {
        finalFile = await compressImageWeb(file);
      }

      const sRef = storageRef(fbStorage, `chats/${matchId}/${Date.now()}_${file.name}`);
      await uploadBytes(sRef, finalFile, { contentType: file.type });
      const mediaUrl = await getStorageUrl(sRef);

      await apiRequest('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          matchId,
          messageType: type,
          mediaPath: mediaUrl,
          recipientId: targetUser.id
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
    <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col h-[80vh] overflow-hidden">
      {/* Header du Chat */}
      <div className="p-4 border-b border-slate-50 flex items-center gap-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={() => navigate('/matches')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
          <ChevronLeft size={24} />
        </button>
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 cursor-pointer" onClick={() => navigate(`/profile/${targetUser.id}`)}>
          <img src={targetUser.photos?.[0]} className="w-full h-full object-cover" alt="" />
        </div>
        <div className="flex-1 cursor-pointer" onClick={() => navigate(`/profile/${targetUser.id}`)}>
          <div className="flex items-center gap-1">
            <span className="font-black text-slate-900">{targetUser.name}</span>
            {targetUser.is_verified && <ShieldCheck size={14} className="text-blue-500" />}
            {(targetUser.galanterie_score || 0) >= 4.5 && <Gem size={14} className="text-rose-600" />}
          </div>
          <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">En ligne</span>
        </div>
      </div>

      {/* Zone des Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
        <div className="bg-slate-100/50 p-4 rounded-3xl text-center border border-slate-200/50 mb-4">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
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
                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
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
                      className="max-w-full rounded-2xl mb-2 bg-black"
                    />
                  )}

                  {/* Suggestions Lieux/Events */}
                  {(isVenue || isEvent) && (
                    <div className="mb-2 p-2 bg-slate-50 rounded-2xl border border-slate-100 text-slate-900">
                      <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400 mb-2">
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
                      onClick={() => handleTranslate(msg.id, msg.content)}
                      className="mt-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-2 w-full text-left hover:text-primary transition-colors"
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

                <div className={`text-[9px] font-bold uppercase tracking-tighter text-slate-400 px-2`}>
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
      <div className="p-4 bg-white border-t border-slate-50">
        {inputText === '' && (
          <button
            onClick={handleAiAssist}
            disabled={generating}
            className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-secondary bg-purple-50 px-4 py-2 rounded-full hover:bg-purple-100 transition-colors"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {t('ai_nudge')}
          </button>
        )}

        <form onSubmit={handleSend} className="flex gap-3 items-center">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-3 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
            >
              <ImageIcon size={20} />
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading}
              className="p-3 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
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
            placeholder={uploading ? "Envoi du fichier..." : t('write_message')}
            className="flex-1 bg-slate-50 border-none px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium disabled:opacity-50"
          />
          <button
            disabled={(!inputText.trim() && !uploading) || sending || uploading}
            className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-100 disabled:opacity-30"
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} fill="currentColor" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
