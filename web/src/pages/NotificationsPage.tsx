import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Archive,
  Bell,
  Calendar,
  CheckCheck,
  ChevronLeft,
  CreditCard,
  Heart,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';
import { useAuth } from '../context/AuthContext';

type NotificationType =
  | 'ALL'
  | 'MESSAGE'
  | 'LIKE_RECEIVED'
  | 'ROSE_RECEIVED'
  | 'STORY_LIKED'
  | 'MATCH_CREATED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'ADMIN'
  | 'SECURITY'
  | 'PARTNER'
  | 'AGENDA';

type GalantNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  target_route?: string | null;
  target_id?: string | null;
  metadata?: Record<string, any>;
  is_read?: boolean;
  created_at?: string;
};

const FILTERS: Array<{ id: NotificationType; label: string }> = [
  { id: 'ALL', label: 'Toutes' },
  { id: 'MESSAGE', label: 'Messages' },
  { id: 'LIKE_RECEIVED', label: 'Likes' },
  { id: 'ROSE_RECEIVED', label: 'Roses' },
  { id: 'PAYMENT_SUCCESS', label: 'Paiements' },
  { id: 'PARTNER', label: 'Partenaires' },
  { id: 'AGENDA', label: 'Agenda' },
  { id: 'ADMIN', label: 'Admin' },
];

const iconForType = (type: NotificationType) => {
  if (type === 'MESSAGE') return MessageSquare;
  if (type === 'LIKE_RECEIVED') return Heart;
  if (type === 'ROSE_RECEIVED' || type === 'STORY_LIKED' || type === 'MATCH_CREATED') return Sparkles;
  if (type === 'PAYMENT_SUCCESS' || type === 'PAYMENT_FAILED') return CreditCard;
  if (type === 'SECURITY' || type === 'ADMIN') return ShieldCheck;
  if (type === 'PARTNER') return Store;
  if (type === 'AGENDA') return Calendar;
  return Bell;
};

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<GalantNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationType>('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [rosesInboxCount, setRosesInboxCount] = useState(0);

  const likesQuickCount = Number(profile?.likes_count || 0);
  const returnPath = typeof location.state?.from === 'string' ? location.state.from : '/profile';

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '80' });
      if (filter !== 'ALL') params.set('type', filter);
      if (unreadOnly) params.set('unreadOnly', 'true');
      const payload = await apiRequest<{ notifications: GalantNotification[] }>(`/api/notifications?${params.toString()}`, { requireAuth: true });
      setNotifications(payload.notifications || []);
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Impossible de charger les notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    void loadNotifications();
  }, [filter, unreadOnly, authLoading, user?.uid]);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      return () => {
        cancelled = true;
      };
    }

    if (!user) {
      setRosesInboxCount(0);
      return () => {
        cancelled = true;
      };
    }

    apiRequest<any[]>('/api/super-likes/received', { requireAuth: true })
      .then((rows) => {
        if (!cancelled) {
          setRosesInboxCount((rows || []).filter((row) => row.status === 'PENDING' || row.is_countable).length);
        }
      })
      .catch(() => {
        if (!cancelled) setRosesInboxCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.uid]);

  const unreadCount = useMemo(() => notifications.filter((item) => item.is_read !== true).length, [notifications]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, is_read: true } : item));
    await apiRequest(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST', requireAuth: true });
  };

  const archiveNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    await apiRequest(`/api/notifications/${encodeURIComponent(id)}/archive`, { method: 'POST', requireAuth: true });
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await apiRequest('/api/notifications/read-all', { method: 'POST', requireAuth: true });
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Action impossible.');
    } finally {
      setMarkingAll(false);
    }
  };

  const openNotification = async (item: GalantNotification) => {
    if (item.is_read !== true) {
      try { await markAsRead(item.id); } catch {}
    }
    if (item.target_route) navigate(item.target_route);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24">
      <div className="mb-8 flex items-start gap-4">
        <button
          onClick={() => navigate(returnPath)}
          className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-slate-300 transition hover:text-white"
          aria-label="Retour"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-prestige text-primary">Centre interne</p>
          <h1 className="text-3xl font-black text-slate-950 dark:text-white">Notifications</h1>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
            Vos alertes, likes et roses recues au meme endroit.
          </p>
        </div>
        <button
          onClick={markAllAsRead}
          disabled={markingAll || unreadCount === 0}
          className="hidden items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-tight text-white shadow-lg shadow-primary/20 transition disabled:opacity-40 sm:flex"
        >
          <CheckCheck size={16} />
          {markingAll ? '...' : 'Tout lu'}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/likes')}
          className="group rounded-[1.5rem] border border-rose-100 bg-white p-4 text-left shadow-lg shadow-rose-500/5 transition hover:-translate-y-0.5 hover:border-primary/30 dark:border-rose-500/10 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-primary dark:bg-rose-500/10">
              <Heart size={20} />
            </div>
            <span className="min-w-8 rounded-full bg-primary px-2 py-1 text-center text-xs font-black text-white">
              {likesQuickCount > 99 ? '99+' : likesQuickCount}
            </span>
          </div>
          <p className="text-sm font-black uppercase tracking-tight text-slate-950 dark:text-white">Likes recus</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">Voir vos admirateurs</p>
        </button>

        <button
          onClick={() => navigate('/roses')}
          className="group rounded-[1.5rem] border border-amber-100 bg-white p-4 text-left shadow-lg shadow-amber-500/5 transition hover:-translate-y-0.5 hover:border-amber-300 dark:border-amber-500/10 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10">
              <Sparkles size={20} />
            </div>
            <span className="min-w-8 rounded-full bg-amber-500 px-2 py-1 text-center text-xs font-black text-white">
              {rosesInboxCount > 99 ? '99+' : rosesInboxCount}
            </span>
          </div>
          <p className="text-sm font-black uppercase tracking-tight text-slate-950 dark:text-white">Roses recues</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">Super Likes a traiter</p>
        </button>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`shrink-0 rounded-2xl px-4 py-2 text-[11px] font-black uppercase tracking-tight transition ${
              filter === item.id
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400 border border-slate-100 dark:border-white/10'
            }`}
          >
            {item.label}
          </button>
        ))}
        <button
          onClick={() => setUnreadOnly((value) => !value)}
          className={`shrink-0 rounded-2xl px-4 py-2 text-[11px] font-black uppercase tracking-tight transition ${
            unreadOnly ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400 border border-slate-100 dark:border-white/10'
          }`}
        >
          Non lues
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-[2rem] border border-white/10 bg-slate-900/60">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-10 text-center">
            <Bell className="mx-auto mb-4 text-slate-600" size={42} />
            <p className="font-black text-white">Aucune notification</p>
            <p className="mt-2 text-sm font-bold text-slate-500">Les informations importantes apparaitront ici.</p>
          </div>
        ) : notifications.map((item) => {
          const Icon = iconForType(item.type);
          const unread = item.is_read !== true;
          return (
            <article
              key={item.id}
              className={`group rounded-[1.5rem] border p-4 transition ${
                unread
                  ? 'border-primary/30 bg-primary/10'
                  : 'border-slate-100 bg-white dark:border-white/10 dark:bg-slate-900'
              }`}
            >
              <button className="flex w-full items-start gap-4 text-left" onClick={() => void openNotification(item)}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${unread ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-black text-slate-950 dark:text-white">{item.title || 'Galant'}</p>
                    {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{item.message}</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-prestige text-slate-400">{formatDate(item.created_at)}</p>
                </div>
              </button>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => void archiveNotification(item.id)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-tight text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <Archive size={14} />
                  Archiver
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsPage;
