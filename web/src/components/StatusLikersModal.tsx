import React from 'react';
import { X, Heart, ShieldCheck, Gem, Loader2 } from 'lucide-react';
import type { StatusLiker } from './LikerProfileModal';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  likers: StatusLiker[];
  loading: boolean;
  onOpenProfile: (liker: StatusLiker) => void;
  onLikeBack: (liker: StatusLiker) => void;
  likingBackUserId: string | null;
  formatDate: (date: string) => string;
}

const StatusLikersModal: React.FC<Props> = ({
  isOpen,
  onClose,
  likers,
  loading,
  onOpenProfile,
  onLikeBack,
  likingBackUserId,
  formatDate,
}) => {
  if (!isOpen) return null;

  const renderState = (liker: StatusLiker) => {
    if (liker.is_matched) return <span className="text-blue-600">Match</span>;
    if (liker.liked_back) return <span className="text-emerald-600">Like envoye</span>;
    return <span className="text-primary">Nouveau</span>;
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-950">Personnes ayant aime</h3>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Votre story</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 hover:bg-slate-100 rounded-full text-slate-500 flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : likers.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                <Heart size={32} />
              </div>
              <p className="text-slate-400 font-bold text-sm">Pas encore de likes sur cette story.</p>
            </div>
          ) : (
            likers.map((liker) => (
              <div key={`${liker.user_id}-${liker.created_at}`} className="bg-slate-50/70 p-3 rounded-2xl flex items-center gap-3 border border-slate-100">
                <button
                  onClick={() => onOpenProfile(liker)}
                  className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0"
                  aria-label={`Ouvrir le profil de ${liker.profile.name}`}
                >
                  <img src={optimizedPhotoUrl(liker.profile.photos?.[0], liker.profile.photo_variants, 'thumb') || 'https://placehold.co/100x100'} className="w-full h-full object-cover" alt="" />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-black text-slate-900 text-sm truncate">{liker.profile.name}</p>
                    {liker.profile.is_verified && <ShieldCheck size={14} className="text-blue-500 flex-shrink-0" />}
                    {liker.profile.is_premium && <Gem size={14} className="text-amber-500 flex-shrink-0" />}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 truncate">
                    {formatDate(liker.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="hidden sm:block text-[11px] font-black uppercase tracking-tight">
                    {renderState(liker)}
                  </span>
                  <button
                    onClick={() => onOpenProfile(liker)}
                    className="px-3 h-9 rounded-full bg-white text-slate-800 border border-slate-200 text-[11px] font-black hover:border-primary/40 transition-colors"
                  >
                    Profil
                  </button>
                  <button
                    onClick={() => onLikeBack(liker)}
                    disabled={!!liker.liked_back || !!liker.is_matched || likingBackUserId === liker.user_id}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all active:scale-95 disabled:cursor-not-allowed ${
                      liker.liked_back || liker.is_matched ? 'bg-emerald-600' : 'bg-primary hover:scale-105'
                    } ${likingBackUserId === liker.user_id ? 'opacity-65' : ''}`}
                    aria-label="Liker en retour"
                  >
                    <Heart size={16} fill="currentColor" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusLikersModal;
