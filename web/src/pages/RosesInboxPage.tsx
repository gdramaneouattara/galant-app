import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '@shared/lib/api';
import { Heart, ShieldCheck, MapPin, MessageCircle, Lock, Star, ChevronLeft, Check, X, CreditCard, Sparkles } from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';
import { Link, useNavigate } from 'react-router-dom';
import { useSubscription } from '@shared/hooks/useSubscription';

interface SuperLikeRow {
  id: string;
  sender_id: string;
  created_at: string;
  status: 'PENDING' | 'ACCEPTED' | 'IGNORED';
  note?: string;
  is_locked: boolean;
  user: {
    id: string;
    name: string;
    age: number;
    city: string | null;
    photos: string[];
    is_verified: boolean;
    is_premium: boolean;
    bio?: string;
  };
}

const RosesInboxPage: React.FC = () => {
  const { user, profile, t } = useAuth();
  const [superLikes, setSuperLikes] = useState<SuperLikeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const { purchaseWithPaystack } = useSubscription();
  const navigate = useNavigate();

  const fetchSuperLikes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiRequest<SuperLikeRow[]>('/api/super-likes/received', { requireAuth: true });
      setSuperLikes(data || []);
    } catch (error) {
      console.error('Error fetching super likes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchSuperLikes();
  }, [user, fetchSuperLikes]);

  const handleRespond = async (row: SuperLikeRow, action: 'ACCEPT' | 'IGNORE') => {
    if (respondingId) return;
    setRespondingId(row.id);
    try {
      await apiRequest(`/api/super-likes/${row.id}/respond`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ action }),
      });

      if (action === 'IGNORE') {
        setSuperLikes(prev => prev.filter(item => item.id !== row.id));
      } else {
        setSuperLikes(prev => prev.map(item => item.id === row.id ? { ...item, status: 'ACCEPTED' } : item));
        showAlert('Match 🎉', `Vous avez accepté la rose de ${row.user.name} !`);
      }
    } catch (error: any) {
      showAlert('Erreur', error.message);
    } finally {
      setRespondingId(null);
    }
  };

  const handleUnlockNote = async (row: SuperLikeRow) => {
    if (unlockingId) return;
    setUnlockingId(row.id);
    try {
      const ok = await purchaseWithPaystack('ROSE_NOTE_UNLOCK', 500, row.sender_id);
      if (ok) {
        showAlert('Succès', 'Note débloquée !');
        fetchSuperLikes();
      }
    } catch (error: any) {
      showAlert('Erreur', error.message);
    } finally {
      setUnlockingId(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Ouverture de la boîte...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 space-y-10">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/profile')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-black italic dark:text-white">{t('rose_box')} 🌹</h2>
          <p className="text-slate-500 font-medium">Découvrez vos attentions d'exception</p>
        </div>
      </div>

      {superLikes.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-white/5">
          <Star size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
          <p className="text-slate-400 font-bold">Aucune rose reçue pour le moment.</p>
          <p className="text-slate-500 text-xs mt-2">Boostez votre profil pour attirer l'attention !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {superLikes.map((row) => (
            <div key={row.id} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border-2 transition-all overflow-hidden ${row.status === 'ACCEPTED' ? 'border-green-500/20' : 'border-slate-50 dark:border-white/5'}`}>
              <div className="p-6 space-y-6">
                <div className="flex gap-5 items-center">
                  <div className={`relative w-20 h-24 flex-shrink-0 rounded-2xl overflow-hidden shadow-md ${row.is_locked ? 'blur-sm grayscale' : ''}`}>
                    <img
                      src={row.is_locked ? 'https://placehold.co/200x300?text=?' : row.user.photos?.[0]}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-900 dark:text-white text-lg truncate">
                        {row.is_locked ? 'Élégante Galante' : row.user.name}
                      </span>
                      {!row.is_locked && row.user.is_verified && <ShieldCheck size={16} className="text-blue-500" />}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-xs font-bold uppercase mb-3">
                      <MapPin size={12} />
                      <span>{row.is_locked ? 'Abidjan' : (row.user.city || 'Ville non renseignée')}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-xl w-fit">
                      <Star size={12} className="text-primary" fill="currentColor" />
                      <span className="text-[10px] font-[1000] text-primary uppercase tracking-tighter">Super Like</span>
                    </div>
                  </div>
                </div>

                {/* Note Parfumée Section */}
                <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 relative">
                  <div className="absolute -top-3 left-4 bg-primary text-white text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-[0.2em]">
                    Note Parfumée
                  </div>
                  {row.is_locked ? (
                    <div className="text-center py-2 space-y-3">
                      <p className="text-xs text-slate-400 font-bold italic italic">Cette note est privée...</p>
                      <button
                        onClick={() => handleUnlockNote(row)}
                        disabled={unlockingId === row.id}
                        className="flex items-center gap-2 mx-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                      >
                        {unlockingId === row.id ? 'Chargement...' : <><CreditCard size={14} /> Débloquer (500 F)</>}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic leading-relaxed">
                      "{row.note || "A envoyé un Super Like sans message."}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {row.status === 'PENDING' ? (
                    <>
                      <button
                        onClick={() => handleRespond(row, 'IGNORE')}
                        disabled={!!respondingId}
                        className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all"
                      >
                        Ignorer
                      </button>
                      <button
                        onClick={() => handleRespond(row, 'ACCEPT')}
                        disabled={!!respondingId}
                        className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {respondingId === row.id ? '...' : <><Check size={16} strokeWidth={3} /> Accepter la Rose</>}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => navigate('/matches')}
                      className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={16} /> Discuter maintenant
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RosesInboxPage;
