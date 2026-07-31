import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, Heart, MapPin, MessageCircle, ShieldCheck, Star, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';
import { useMatchmaking } from '@shared/hooks/useMatchmaking';
import InteractionPurchaseModal from '../components/InteractionPurchaseModal';
import SuperLikeDetailModal, { type SuperLikeRow } from '../components/SuperLikeDetailModal';

type RoseTab = 'PENDING' | 'HISTORY';

const STATUS_PRIORITY: Record<string, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  IGNORED: 2,
};

const RosesInboxPage: React.FC = () => {
  const { user, profile, t } = useAuth();
  const navigate = useNavigate();
  const { handleSwipe } = useMatchmaking();

  const [superLikes, setSuperLikes] = useState<SuperLikeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RoseTab>('PENDING');
  const [selectedRose, setSelectedRose] = useState<SuperLikeRow | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [likedUserIds, setLikedUserIds] = useState<Set<string>>(new Set());
  const [superLikedUserIds, setSuperLikedUserIds] = useState<Set<string>>(new Set());
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  const fetchSuperLikes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest<SuperLikeRow[]>('/api/super-likes/received', { requireAuth: true });
      const rows = (data || []).sort((left, right) => {
        const delta = (STATUS_PRIORITY[left.status] ?? 9) - (STATUS_PRIORITY[right.status] ?? 9);
        if (delta !== 0) return delta;
        return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
      });
      setSuperLikes(rows);
      setLikedUserIds(new Set(rows.filter((row) => row.liked_back || row.is_matched).map((row) => row.user.id)));
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger la boite des roses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void fetchSuperLikes();
  }, [user, fetchSuperLikes]);

  const pendingRows = useMemo(() => superLikes.filter((row) => row.status === 'PENDING'), [superLikes]);
  const historyRows = useMemo(() => superLikes.filter((row) => row.status !== 'PENDING'), [superLikes]);
  const displayedRows = activeTab === 'PENDING' ? pendingRows : historyRows;
  const unavailableHint = !loading && !error && superLikes.length === 0 && (profile?.roses_count || 0) > 0;

  const updateRose = (id: string, patch: Partial<SuperLikeRow>) => {
    setSuperLikes((prev) => prev.map((row) => row.id === id ? { ...row, ...patch } : row));
    setSelectedRose((current) => current?.id === id ? { ...current, ...patch } : current);
  };

  const handleRespond = async (row: SuperLikeRow, action: 'ACCEPT' | 'IGNORE') => {
    if (respondingId) return;
    setRespondingId(row.id);
    try {
      const response = await apiRequest<{ success: boolean; matchId?: string }>(`/api/super-likes/${row.id}/respond`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ action }),
      });

      if (action === 'IGNORE') {
        updateRose(row.id, { status: 'IGNORED', status_label: 'Ignoree', is_countable: false });
        showAlert('Rose ignoree', 'Cette rose a ete placee dans votre historique.');
        if (pendingRows.length <= 1) setActiveTab('HISTORY');
      } else {
        updateRose(row.id, {
          status: 'ACCEPTED',
          status_label: 'Acceptee',
          is_countable: false,
          is_matched: true,
          can_message: true,
          matchId: response.matchId,
        });
        showAlert('Rose acceptee', `Vous avez accepte la rose de ${row.user.name}.`);
      }
    } catch (err: any) {
      showAlert('Erreur', err?.message || 'Impossible de traiter cette rose.');
    } finally {
      setRespondingId(null);
    }
  };

  const handleLike = async (row: SuperLikeRow) => {
    if (likingId || likedUserIds.has(row.user.id) || row.liked_back || row.is_matched) return;
    setLikingId(row.user.id);
    try {
      const res = await handleSwipe(row.user.id, 'RIGHT');
      if (res) {
        setLikedUserIds((prev) => new Set(prev).add(row.user.id));
        updateRose(row.id, {
          liked_back: true,
          is_matched: !!res.matched,
          can_message: !!res.matched || row.can_message,
          matchId: res.matchId || row.matchId,
        });
        showAlert(res.matched ? 'Match' : 'Succes', res.matched ? `Vous avez matche avec ${row.user.name}.` : 'Like envoye.');
      }
    } finally {
      setLikingId(null);
    }
  };

  const handleSuperLikeSuccess = async () => {
    if (!selectedRose) return;
    const res = await handleSwipe(selectedRose.user.id, 'RIGHT', true);
    if (!res) return;
    setSuperLikedUserIds((prev) => new Set(prev).add(selectedRose.user.id));
    updateRose(selectedRose.id, {
      liked_back: true,
      is_matched: !!res?.matched || selectedRose.is_matched,
      can_message: !!res?.matched || selectedRose.can_message,
      matchId: res?.matchId || selectedRose.matchId,
    });
    showAlert('Succes', res?.matched ? 'Rose envoyee et match cree.' : 'Rose envoyee.');
  };

  const openChat = (row: SuperLikeRow) => {
    if (row.matchId) {
      navigate(`/chat/${row.matchId}`);
      return;
    }
    navigate('/matches');
  };

  const renderStatus = (row: SuperLikeRow) => {
    if (row.status === 'ACCEPTED') return <span className="text-emerald-600">Acceptee</span>;
    if (row.status === 'IGNORED') return <span className="text-slate-500">Ignoree</span>;
    return <span className="text-amber-600">En attente</span>;
  };

  const renderRows = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 transition-colors">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="mt-4 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px] transition-colors">Ouverture de la boite...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2rem] border border-red-100 dark:border-red-900/30 transition-colors">
          <p className="text-red-600 dark:text-red-400 font-black transition-colors">{error}</p>
          <button onClick={() => void fetchSuperLikes()} className="mt-4 text-primary font-black text-xs uppercase tracking-widest">
            Reessayer
          </button>
        </div>
      );
    }

    if (displayedRows.length === 0) {
      return (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-white/5 px-6 transition-colors">
          <Star size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4 transition-colors" />
          <p className="text-slate-400 dark:text-slate-500 font-bold transition-colors">
            {activeTab === 'PENDING' ? 'Aucune rose a traiter pour le moment.' : 'Aucune rose dans l historique.'}
          </p>
          {unavailableHint && (
            <p className="text-slate-500 dark:text-slate-600 text-xs mt-3 max-w-md mx-auto transition-colors">
              Certaines roses comptabilisees ne sont plus disponibles car le profil expediteur est incomplet, suspendu ou supprime.
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayedRows.map((row) => (
          <div
            key={row.id}
            className={`bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl dark:shadow-none border-2 transition-all overflow-hidden ${
              row.status === 'ACCEPTED'
                ? 'border-emerald-500/20'
                : row.status === 'IGNORED'
                  ? 'border-slate-100 dark:border-white/5 opacity-80'
                  : 'border-amber-100 dark:border-amber-900/30'
            }`}
          >
            <div className="p-5 space-y-5">
              <div className="flex gap-4 items-center">
                <button
                  onClick={() => setSelectedRose(row)}
                  className="relative w-20 h-24 flex-shrink-0 rounded-2xl overflow-hidden shadow-md"
                  aria-label={`Ouvrir la fiche de ${row.user.name}`}
                >
                  <img
                    src={row.user.photos?.[0] || 'https://placehold.co/200x300?text=?'}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-900 dark:text-white text-lg truncate transition-colors">
                      {row.user.name}{typeof row.user.age === 'number' ? `, ${row.user.age}` : ''}
                    </span>
                    {row.user.is_verified && <ShieldCheck size={16} className="text-blue-500 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase mb-3 transition-colors">
                    <MapPin size={12} />
                    <span className="truncate">{row.user.city || 'Ville non renseignee'}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-xl w-fit transition-colors">
                    <Star size={12} className="text-primary" fill="currentColor" />
                    <span className="text-[10px] font-[1000] text-primary uppercase tracking-tighter">Rose recue</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-black uppercase tracking-widest transition-colors">
                  {renderStatus(row)}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 transition-colors">
                  {row.created_at ? new Date(row.created_at).toLocaleString('fr-FR') : ''}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 relative transition-colors">
                <div className="absolute -top-3 left-4 bg-primary text-white text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-[0.2em]">
                  Note
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic leading-relaxed transition-colors">
                  "{row.note || 'A envoye une rose sans message.'}"
                </p>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setSelectedRose(row)}
                  className="px-4 py-3 rounded-2xl bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Fiche
                </button>

                <button
                  onClick={() => void handleLike(row)}
                  disabled={likedUserIds.has(row.user.id) || row.liked_back || row.is_matched || likingId === row.user.id}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white transition-all disabled:opacity-60 ${
                    likedUserIds.has(row.user.id) || row.liked_back || row.is_matched ? 'bg-emerald-600' : 'bg-primary'
                  }`}
                  aria-label="Liker en retour"
                >
                  <Heart size={17} fill="currentColor" />
                </button>

                {row.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => void handleRespond(row, 'IGNORE')}
                      disabled={!!respondingId}
                      className="flex-1 min-w-[96px] bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all disabled:opacity-60"
                    >
                      <X size={14} className="inline mr-1" />
                      Ignorer
                    </button>
                    <button
                      onClick={() => void handleRespond(row, 'ACCEPT')}
                      disabled={!!respondingId}
                      className="flex-[2] min-w-[140px] bg-primary text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <Check size={16} strokeWidth={3} />
                      Accepter
                    </button>
                  </>
                ) : row.status === 'ACCEPTED' ? (
                  <button
                    onClick={() => openChat(row)}
                    className="flex-1 min-w-[180px] bg-emerald-600 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} />
                    Discuter
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/profile')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400">
          <ChevronLeft size={24} />
        </button>
        <div className="min-w-0">
          <h2 className="text-3xl font-black dark:text-white truncate">{t('rose_box')}</h2>
          <p className="text-slate-500 font-medium">Roses recues, separees des likes et des messages</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`rounded-2xl p-4 text-left border transition-all ${
            activeTab === 'PENDING' ? 'bg-primary text-white border-primary shadow-lg shadow-red-100' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-white/5'
          }`}
        >
          <p className="text-2xl font-black">{pendingRows.length}</p>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">A traiter</p>
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`rounded-2xl p-4 text-left border transition-all ${
            activeTab === 'HISTORY' ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-white/5'
          }`}
        >
          <p className="text-2xl font-black">{historyRows.length}</p>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Historique</p>
        </button>
      </div>

      {renderRows()}

      <SuperLikeDetailModal
        isOpen={!!selectedRose}
        onClose={() => setSelectedRose(null)}
        row={selectedRose}
        onLike={handleLike}
        onRespond={handleRespond}
        onSuperLike={() => setPurchaseOpen(true)}
        isLiked={!!selectedRose && likedUserIds.has(selectedRose.user.id)}
        isSuperLiked={!!selectedRose && superLikedUserIds.has(selectedRose.user.id)}
        isLiking={!!selectedRose && likingId === selectedRose.user.id}
        isResponding={!!selectedRose && respondingId === selectedRose.id}
        isSuperLiking={false}
      />

      <InteractionPurchaseModal
        isOpen={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        type="SUPER_LIKE"
        targetId={selectedRose?.user.id}
        userName={selectedRose?.user.name}
        onSuccess={handleSuperLikeSuccess}
      />
    </div>
  );
};

export default RosesInboxPage;
