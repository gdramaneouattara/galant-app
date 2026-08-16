import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, Loader2, MessageSquare, RefreshCw, Search, Send, ShieldCheck, User } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';

type SupportThread = {
  id: string;
  user_id: string;
  user?: {
    name?: string;
    email?: string | null;
    photo?: string | null;
    role?: string;
    is_premium?: boolean;
    is_partner?: boolean;
  };
  subject?: string;
  status?: 'OPEN' | 'CLOSED';
  last_message?: string;
  last_message_at?: string;
  last_sender_role?: 'USER' | 'ADMIN';
  unread_for_admin?: number;
};

type SupportMessage = {
  id: string;
  sender_role: 'USER' | 'ADMIN';
  sender_name?: string;
  message: string;
  created_at?: string;
};

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const AdminSupport: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedThread = searchParams.get('thread') || '';
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>(requestedThread);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState('');
  const selectedThreadIdRef = useRef(selectedThreadId);
  const messageRequestRef = useRef(0);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const filteredThreads = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter((thread) => (
      `${thread.user?.name || ''} ${thread.user?.email || ''} ${thread.subject || ''} ${thread.last_message || ''}`
        .toLowerCase()
        .includes(needle)
    ));
  }, [query, threads]);

  const loadThreads = async () => {
    try {
      setLoadingThreads(true);
      const payload = await apiRequest<{ threads: SupportThread[] }>('/api/admin/support/threads', { requireAuth: true });
      const rows = payload.threads || [];
      setThreads(rows);
      if (!selectedThreadId && rows.length > 0) setSelectedThreadId(rows[0].id);
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Impossible de charger le support.');
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadMessages = useCallback(async (threadId: string) => {
    if (!threadId) return;
    const requestId = messageRequestRef.current + 1;
    messageRequestRef.current = requestId;
    try {
      setLoadingMessages(true);
      setMessages([]);
      const payload = await apiRequest<{ thread: SupportThread; messages: SupportMessage[] }>(
        `/api/admin/support/threads/${encodeURIComponent(threadId)}/messages`,
        { requireAuth: true }
      );
      if (messageRequestRef.current !== requestId || selectedThreadIdRef.current !== threadId) return;
      setMessages(payload.messages || []);
      setThreads((current) => current.map((thread) => (
        thread.id === threadId ? { ...thread, ...payload.thread, unread_for_admin: 0 } : thread
      )));
    } catch (error: any) {
      if (messageRequestRef.current !== requestId || selectedThreadIdRef.current !== threadId) return;
      showAlert('Erreur', error.message || 'Impossible de charger la conversation.');
    } finally {
      if (messageRequestRef.current === requestId && selectedThreadIdRef.current === threadId) {
        setLoadingMessages(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, []);

  useEffect(() => {
    if (requestedThread) setSelectedThreadId(requestedThread);
  }, [requestedThread]);

  useEffect(() => {
    if (!selectedThreadId) return;
    setSearchParams({ thread: selectedThreadId });
    void loadMessages(selectedThreadId);
  }, [selectedThreadId]);

  const sendReply = async () => {
    if (!selectedThreadId || !reply.trim()) return;
    const threadId = selectedThreadId;
    const draftReply = reply;
    try {
      setSending(true);
      const payload = await apiRequest<{ thread: SupportThread; messages: SupportMessage[] }>(
        `/api/admin/support/threads/${encodeURIComponent(threadId)}/reply`,
        {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({ message: draftReply })
        }
      );
      if (selectedThreadIdRef.current === threadId) {
        setReply('');
        setMessages(payload.messages || []);
      }
      setThreads((current) => current.map((thread) => (
        thread.id === threadId ? { ...thread, ...payload.thread } : thread
      )));
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Impossible d envoyer la reponse.');
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status: 'OPEN' | 'CLOSED') => {
    if (!selectedThreadId) return;
    try {
      const payload = await apiRequest<{ thread: SupportThread }>(
        `/api/admin/support/threads/${encodeURIComponent(selectedThreadId)}/status`,
        {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({ status })
        }
      );
      setThreads((current) => current.map((thread) => (
        thread.id === selectedThreadId ? { ...thread, ...payload.thread, status } : thread
      )));
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Impossible de modifier le statut.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col gap-6 transition-colors xl:flex-row">
      <div className="flex w-full flex-col overflow-hidden rounded-[2rem] border border-slate-50 bg-white shadow-xl transition-colors dark:border-white/5 dark:bg-slate-900 xl:w-96">
        <div className="space-y-4 border-b border-slate-50 p-6 dark:border-white/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black italic text-slate-900 transition-colors dark:text-white">Support Inbox</h3>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-prestige text-slate-400">Messages utilisateurs</p>
            </div>
            <button
              onClick={() => void loadThreads()}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition hover:text-primary dark:bg-white/5"
              aria-label="Rafraichir"
            >
              {loadingThreads ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un ticket..."
              className="w-full rounded-xl border-none bg-slate-50 px-10 py-3 text-sm font-medium text-slate-900 outline-none transition-colors dark:bg-slate-800 dark:text-white"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4 no-scrollbar">
          {loadingThreads ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-slate-400">
              <MessageSquare className="mb-3 opacity-30" size={52} />
              <p className="text-sm font-bold">Aucun ticket support.</p>
            </div>
          ) : filteredThreads.map((thread) => {
            const active = selectedThreadId === thread.id;
            const unread = Number(thread.unread_for_admin || 0) > 0;
            return (
              <button
                key={thread.id}
                onClick={() => setSelectedThreadId(thread.id)}
                className={`w-full rounded-2xl p-4 text-left transition-all ${
                  active ? 'bg-primary text-white shadow-lg shadow-red-200 dark:shadow-none' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full ${active ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {thread.user?.photo ? <img src={thread.user.photo} alt="" className="h-full w-full object-cover" /> : <User size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-black">{thread.user?.name || 'Utilisateur'}</p>
                      <span className={`text-[9px] font-black ${active ? 'text-white/60' : 'text-slate-400'}`}>{formatDate(thread.last_message_at)}</span>
                    </div>
                    <p className={`mt-1 truncate text-xs font-bold ${active ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{thread.subject || 'Support Galant'}</p>
                    <p className={`mt-1 truncate text-xs ${active ? 'text-white/70' : 'text-slate-400'}`}>{thread.last_message}</p>
                  </div>
                  {unread && <span className="mt-1 min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-black text-white ring-4 ring-primary/10">{thread.unread_for_admin}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-[620px] flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-50 bg-white shadow-2xl transition-colors dark:border-white/5 dark:bg-slate-900 xl:rounded-[3rem]">
        {selectedThread ? (
          <>
            <div className="flex items-center justify-between gap-4 border-b border-slate-50 bg-white/50 p-6 backdrop-blur-sm transition-colors dark:border-white/5 dark:bg-slate-900/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="truncate font-black text-slate-900 transition-colors dark:text-white">{selectedThread.user?.name || 'Utilisateur'}</h4>
                  {selectedThread.user?.is_premium && <ShieldCheck size={16} className="text-amber-500" />}
                </div>
                <p className="mt-1 truncate text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {selectedThread.user?.email || selectedThread.id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${selectedThread.status === 'CLOSED' ? 'bg-slate-100 text-slate-500 dark:bg-white/5' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {selectedThread.status === 'CLOSED' ? 'Ferme' : 'Ouvert'}
                </span>
                <button
                  onClick={() => void updateStatus(selectedThread.status === 'CLOSED' ? 'OPEN' : 'CLOSED')}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition hover:text-primary dark:bg-white/5"
                  aria-label="Changer le statut"
                >
                  <CheckCircle2 size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/30 p-6 transition-colors dark:bg-slate-950/30">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="animate-spin text-primary" size={34} />
                </div>
              ) : messages.map((item) => {
                const fromAdmin = item.sender_role === 'ADMIN';
                return (
                  <div key={item.id} className={`flex ${fromAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-3xl p-4 text-sm font-medium shadow-sm transition-colors ${fromAdmin ? 'rounded-tr-none bg-primary text-white' : 'rounded-tl-none border border-slate-100 bg-white text-slate-900 dark:border-white/5 dark:bg-slate-800 dark:text-white'}`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{item.message}</p>
                      <div className={`mt-2 flex items-center gap-1 text-[9px] font-bold ${fromAdmin ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'}`}>
                        <Clock size={10} />
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 border-t border-slate-50 p-6 transition-colors dark:border-white/5">
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={2}
                className="min-h-[56px] flex-1 resize-none rounded-2xl bg-slate-50 px-6 py-4 font-medium text-slate-900 outline-none transition-colors focus:ring-2 focus:ring-primary/10 dark:bg-slate-800 dark:text-white"
                placeholder="Repondre a l'utilisateur..."
              />
              <button
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg transition-all hover:bg-black disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-slate-300 transition-colors dark:text-slate-700">
            <MessageSquare size={80} strokeWidth={1} className="opacity-20" />
            <p className="font-bold italic transition-colors">Selectionnez une discussion pour repondre.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSupport;
