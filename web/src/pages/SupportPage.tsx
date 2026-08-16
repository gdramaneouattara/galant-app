import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, LifeBuoy, Loader2, Send, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';
import { useAuth } from '../context/AuthContext';

type SupportThread = {
  id: string;
  subject?: string;
  status?: 'OPEN' | 'CLOSED';
  last_message_at?: string;
  unread_for_user?: number;
};

type SupportMessage = {
  id: string;
  sender_role: 'USER' | 'ADMIN';
  sender_name?: string;
  message: string;
  created_at?: string;
};

const formatDate = (value?: string, language: 'fr' | 'en' = 'fr') => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(language === 'en' ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const SupportPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, language } = useAuth();
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [subject, setSubject] = useState('Support Galant');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const labels = language === 'en'
    ? {
        back: 'Back',
        eyebrow: 'Galant support',
        title: 'Write to the administration',
        subtitle: 'Ask a question about your account, payments, verification or safety.',
        subject: 'Subject',
        message: 'Message',
        placeholder: 'Write your request...',
        send: 'Send to support',
        empty: 'No conversation yet. Send a first message to open a support thread.',
        admin: 'Galant support',
        you: 'You',
        closed: 'Closed',
        open: 'Open',
        error: 'Error',
        loadError: 'Unable to load support.',
        sendError: 'Unable to send your message.',
        sent: 'Message sent'
      }
    : {
        back: 'Retour',
        eyebrow: 'Support Galant',
        title: "Ecrire a l'administration",
        subtitle: 'Posez une question sur votre compte, vos paiements, la verification ou la securite.',
        subject: 'Sujet',
        message: 'Message',
        placeholder: 'Ecrivez votre demande...',
        send: 'Envoyer au support',
        empty: 'Aucune conversation pour le moment. Envoyez un premier message pour ouvrir un fil support.',
        admin: 'Support Galant',
        you: 'Vous',
        closed: 'Ferme',
        open: 'Ouvert',
        error: 'Erreur',
        loadError: 'Impossible de charger le support.',
        sendError: 'Impossible d envoyer votre message.',
        sent: 'Message envoye'
      };

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || ''))),
    [messages]
  );

  const loadSupport = async () => {
    try {
      setLoading(true);
      const payload = await apiRequest<{ thread: SupportThread | null; messages: SupportMessage[] }>('/api/support/thread', { requireAuth: true });
      setThread(payload.thread);
      setMessages(payload.messages || []);
      if (payload.thread?.subject) setSubject(payload.thread.subject);
      await apiRequest('/api/support/read', { method: 'POST', requireAuth: true }).catch(() => {});
    } catch (error: any) {
      showAlert(labels.error, error.message || labels.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    void loadSupport();
  }, [authLoading, user?.uid]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      setSending(true);
      const payload = await apiRequest<{ thread: SupportThread; messages: SupportMessage[] }>('/api/support/messages', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ subject, message })
      });
      setThread(payload.thread);
      setMessages(payload.messages || []);
      setMessage('');
      showAlert(labels.sent, labels.sent);
    } catch (error: any) {
      showAlert(labels.error, error.message || labels.sendError);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24">
      <div className="mb-6 flex items-start gap-4">
        <button
          onClick={() => navigate('/notifications')}
          className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-slate-300 transition hover:text-white"
          aria-label={labels.back}
        >
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-prestige text-primary">{labels.eyebrow}</p>
          <h1 className="text-3xl font-black text-slate-950 dark:text-white">{labels.title}</h1>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{labels.subtitle}</p>
        </div>
        {thread && (
          <span className={`mt-2 rounded-full px-3 py-1 text-[10px] font-black uppercase ${thread.status === 'CLOSED' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-500/10 text-emerald-500'}`}>
            {thread.status === 'CLOSED' ? labels.closed : labels.open}
          </span>
        )}
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-4 shadow-xl">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={34} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="min-h-[300px] space-y-3 rounded-[1.5rem] bg-slate-950/60 p-4">
              {sortedMessages.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center text-center text-slate-500">
                  <LifeBuoy className="mb-4 text-slate-700" size={44} />
                  <p className="max-w-sm text-sm font-bold">{labels.empty}</p>
                </div>
              ) : sortedMessages.map((item) => {
                const isAdmin = item.sender_role === 'ADMIN';
                return (
                  <div key={item.id} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[82%] rounded-3xl px-4 py-3 text-sm font-semibold ${isAdmin ? 'rounded-tl-sm bg-white text-slate-900' : 'rounded-tr-sm bg-primary text-white'}`}>
                      <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase opacity-70">
                        {isAdmin && <ShieldCheck size={12} />}
                        {isAdmin ? labels.admin : labels.you}
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{item.message}</p>
                      <p className={`mt-2 text-[9px] font-black uppercase ${isAdmin ? 'text-slate-400' : 'text-white/60'}`}>
                        {formatDate(item.created_at, language)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-3">
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={120}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary"
                placeholder={labels.subject}
              />
              <div className="flex gap-3">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={3}
                  maxLength={4000}
                  className="min-h-[76px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary"
                  placeholder={labels.placeholder}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !message.trim()}
                  className="flex w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 transition active:scale-95 disabled:opacity-40"
                  aria-label={labels.send}
                >
                  {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                </button>
              </div>
              <button
                onClick={sendMessage}
                disabled={sending || !message.trim()}
                className="rounded-2xl bg-white px-5 py-4 text-xs font-black uppercase tracking-tight text-slate-950 transition hover:bg-slate-100 disabled:opacity-40 sm:hidden"
              >
                {labels.send}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportPage;
