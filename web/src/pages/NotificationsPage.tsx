import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Archive,
  Bell,
  Calendar,
  CheckCheck,
  ChevronLeft,
  CreditCard,
  Flower2,
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

const FILTERS: Array<{ id: NotificationType; label: { fr: string; en: string } }> = [
  { id: 'ALL', label: { fr: 'Toutes', en: 'All' } },
  { id: 'MESSAGE', label: { fr: 'Messages', en: 'Messages' } },
  { id: 'LIKE_RECEIVED', label: { fr: 'Likes', en: 'Likes' } },
  { id: 'ROSE_RECEIVED', label: { fr: 'Roses', en: 'Roses' } },
  { id: 'PAYMENT_SUCCESS', label: { fr: 'Paiements', en: 'Payments' } },
  { id: 'PARTNER', label: { fr: 'Partenaires', en: 'Partners' } },
  { id: 'AGENDA', label: { fr: 'Agenda', en: 'Agenda' } },
  { id: 'ADMIN', label: { fr: 'Admin', en: 'Admin' } },
];

const QUICK_BOX_TYPES: NotificationType[] = ['LIKE_RECEIVED', 'ROSE_RECEIVED'];

const iconForType = (type: NotificationType) => {
  if (type === 'MESSAGE') return MessageSquare;
  if (type === 'LIKE_RECEIVED') return Heart;
  if (type === 'ROSE_RECEIVED') return Flower2;
  if (type === 'STORY_LIKED' || type === 'MATCH_CREATED') return Sparkles;
  if (type === 'PAYMENT_SUCCESS' || type === 'PAYMENT_FAILED') return CreditCard;
  if (type === 'SECURITY' || type === 'ADMIN') return ShieldCheck;
  if (type === 'PARTNER') return Store;
  if (type === 'AGENDA') return Calendar;
  return Bell;
};

const formatDate = (value?: string, language: 'fr' | 'en' = 'fr') => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(language === 'en' ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading, language } = useAuth();
  const [notifications, setNotifications] = useState<GalantNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationType>('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [rosesInboxCount, setRosesInboxCount] = useState(0);

  const likesQuickCount = Number(profile?.likes_count || 0);
  const returnPath = typeof location.state?.from === 'string' ? location.state.from : '/profile';
  const labels = language === 'en'
    ? {
        error: 'Error',
        loadError: 'Unable to load notifications.',
        actionError: 'Action unavailable.',
        back: 'Back',
        eyebrow: 'Internal center',
        title: 'Notifications',
        subtitle: 'Your alerts, likes and roses in one place.',
        allRead: 'All read',
        likesTitle: 'Likes received',
        likesSub: 'View your admirers',
        rosesTitle: 'Roses received',
        rosesSub: 'Roses to handle',
        supportTitle: 'Write to support',
        supportSub: 'Contact the Galant administration',
        journal: 'Activity log',
        history: 'History',
        unread: 'Unread',
        emptyTitle: 'No notifications',
        emptyBody: 'Important updates will appear here.',
        archive: 'Archive'
      }
    : {
        error: 'Erreur',
        loadError: 'Impossible de charger les notifications.',
        actionError: 'Action impossible.',
        back: 'Retour',
        eyebrow: 'Centre interne',
        title: 'Notifications',
        subtitle: 'Vos alertes, likes et roses reçues au même endroit.',
        allRead: 'Tout lu',
        likesTitle: 'Likes reçus',
        likesSub: 'Voir vos admirateurs',
        rosesTitle: 'Roses reçues',
        rosesSub: 'Roses à traiter',
        supportTitle: 'Ecrire au support',
        supportSub: "Contacter l'administration Galant",
        journal: 'Journal d’activité',
        history: 'Historique',
        unread: 'Non lues',
        emptyTitle: 'Aucune notification',
        emptyBody: 'Les informations importantes apparaîtront ici.',
        archive: 'Archiver'
      };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '80' });
      if (filter !== 'ALL') params.set('type', filter);
      if (filter === 'ALL') params.set('excludeTypes', QUICK_BOX_TYPES.join(','));
      if (unreadOnly) params.set('unreadOnly', 'true');
      const payload = await apiRequest<{ notifications: GalantNotification[] }>(`/api/notifications?${params.toString()}`, { requireAuth: true });
      setNotifications(payload.notifications || []);
    } catch (error: any) {
      showAlert(labels.error, error.message || labels.loadError);
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
      const params = new URLSearchParams();
      if (filter !== 'ALL') params.set('type', filter);
      if (filter === 'ALL') params.set('excludeTypes', QUICK_BOX_TYPES.join(','));
      const query = params.toString();
      await apiRequest(`/api/notifications/read-all${query ? `?${query}` : ''}`, { method: 'POST', requireAuth: true });
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (error: any) {
      showAlert(labels.error, error.message || labels.actionError);
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
          aria-label={labels.back}
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-prestige text-primary">{labels.eyebrow}</p>
          <h1 className="text-3xl font-black text-slate-950 dark:text-white">{labels.title}</h1>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
            {labels.subtitle}
          </p>
        </div>
        <button
          onClick={markAllAsRead}
          disabled={markingAll || unreadCount === 0}
          className="hidden items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-tight text-white shadow-lg shadow-primary/20 transition disabled:opacity-40 sm:flex"
        >
          <CheckCheck size={16} />
          {markingAll ? '...' : labels.allRead}
        </button>
      </div>

      <button
        onClick={() => navigate('/support')}
        className="mb-6 flex w-full items-center gap-4 rounded-[1.5rem] border border-primary/20 bg-primary/10 p-4 text-left shadow-lg shadow-primary/5 transition hover:-translate-y-0.5 hover:bg-primary/15"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
          <MessageSquare size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black uppercase tracking-tight text-slate-950 dark:text-white">{labels.supportTitle}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{labels.supportSub}</p>
        </div>
      </button>

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
          <p className="text-sm font-black uppercase tracking-tight text-slate-950 dark:text-white">{labels.likesTitle}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{labels.likesSub}</p>
        </button>

        <button
          onClick={() => navigate('/roses')}
          className="group rounded-[1.5rem] border border-amber-100 bg-white p-4 text-left shadow-lg shadow-amber-500/5 transition hover:-translate-y-0.5 hover:border-amber-300 dark:border-amber-500/10 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10">
              <Flower2 size={20} />
            </div>
            <span className="min-w-8 rounded-full bg-amber-500 px-2 py-1 text-center text-xs font-black text-white">
              {rosesInboxCount > 99 ? '99+' : rosesInboxCount}
            </span>
          </div>
          <p className="text-sm font-black uppercase tracking-tight text-slate-950 dark:text-white">{labels.rosesTitle}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{labels.rosesSub}</p>
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
            {item.label[language]}
          </button>
        ))}
        <button
          onClick={() => setUnreadOnly((value) => !value)}
          className={`shrink-0 rounded-2xl px-4 py-2 text-[11px] font-black uppercase tracking-tight transition ${
            unreadOnly ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400 border border-slate-100 dark:border-white/10'
          }`}
        >
          {labels.unread}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-prestige text-slate-400">
            {filter === 'ALL' ? labels.journal : `${labels.history} ${FILTERS.find((item) => item.id === filter)?.label[language] || ''}`}
          </p>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-[2rem] border border-white/10 bg-slate-900/60">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-10 text-center">
            <Bell className="mx-auto mb-4 text-slate-600" size={42} />
            <p className="font-black text-white">{labels.emptyTitle}</p>
            <p className="mt-2 text-sm font-bold text-slate-500">{labels.emptyBody}</p>
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
                  <p className="mt-2 text-[10px] font-black uppercase tracking-prestige text-slate-400">{formatDate(item.created_at, language)}</p>
                </div>
              </button>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => void archiveNotification(item.id)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-tight text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <Archive size={14} />
                  {labels.archive}
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
