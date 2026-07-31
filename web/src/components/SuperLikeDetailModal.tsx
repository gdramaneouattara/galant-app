import React from 'react';
import { X, Heart, Check, Star, MapPin } from 'lucide-react';
import OptimizedImage from './OptimizedImage';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';

export type SuperLikeStatus = 'PENDING' | 'ACCEPTED' | 'IGNORED';

export interface SuperLikeRow {
  id: string;
  sender_id: string;
  created_at: string;
  status: SuperLikeStatus;
  status_label?: string;
  note?: string | null;
  is_locked?: boolean;
  is_countable?: boolean;
  liked_back?: boolean;
  is_matched?: boolean;
  can_message?: boolean;
  matchId?: string;
  user: {
    id: string;
    name: string;
    age?: number | null;
    city?: string | null;
    country?: string | null;
    relationship_goal?: string | null;
    bio?: string | null;
    photos: string[];
    photo_variants?: Record<string, { thumb?: string; medium?: string; full?: string }>;
    interests?: string[];
    is_verified?: boolean;
    is_premium?: boolean;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  row: SuperLikeRow | null;
  onLike: (row: SuperLikeRow) => void;
  onRespond: (row: SuperLikeRow, action: 'ACCEPT' | 'IGNORE') => void;
  onSuperLike: () => void;
  isLiked: boolean;
  isSuperLiked: boolean;
  isLiking: boolean;
  isResponding: boolean;
  isSuperLiking: boolean;
}

const statusClasses: Record<SuperLikeStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  IGNORED: 'bg-slate-100 text-slate-600',
};

const statusLabels: Record<SuperLikeStatus, string> = {
  PENDING: 'En attente',
  ACCEPTED: 'Acceptee',
  IGNORED: 'Ignoree',
};

const SuperLikeDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  row,
  onLike,
  onRespond,
  onSuperLike,
  isLiked,
  isSuperLiked,
  isLiking,
  isResponding,
  isSuperLiking,
}) => {
  if (!isOpen || !row) return null;

  const photo = row.user.photos?.[0] || 'https://placehold.co/800x1000';
  const location = [row.user.city, row.user.country].filter(Boolean).join(', ');
  const status = row.status || 'PENDING';

  return (
    <div className="fixed inset-0 z-[180] bg-slate-950/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 fade-in duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Rose recue</p>
            <h3 className="text-xl font-black text-slate-950 truncate">
              {row.user.name}{typeof row.user.age === 'number' ? `, ${row.user.age}` : ''}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(92vh-73px)] sm:max-h-[calc(90vh-73px)] p-5 space-y-5">
          <OptimizedImage src={optimizedPhotoUrl(photo, row.user.photo_variants, 'medium')} alt="" className="w-full aspect-[4/5] rounded-xl object-cover bg-slate-100" eager />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-500 font-bold text-sm min-w-0">
                <MapPin size={16} className="text-primary flex-shrink-0" />
                <span className="truncate">{location || 'Localisation non renseignee'}</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex-shrink-0 ${statusClasses[status]}`}>
                {row.status_label || statusLabels[status]}
              </span>
            </div>

            {row.user.relationship_goal && (
              <span className="inline-flex bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-black">
                {row.user.relationship_goal}
              </span>
            )}

            {row.note && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Note parfumee</p>
                <p className="text-sm text-slate-700 font-medium italic leading-relaxed">"{row.note}"</p>
              </div>
            )}

            {row.user.bio && (
              <p className="text-slate-700 leading-relaxed font-medium">{row.user.bio}</p>
            )}

            {(row.user.interests || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(row.user.interests || []).slice(0, 8).map((interest) => (
                  <span key={`${row.id}-${interest}`} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold">
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1">
            <button
              onClick={() => onLike(row)}
              disabled={isLiked || row.liked_back || row.is_matched || isLiking}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:cursor-not-allowed ${
                isLiked || row.liked_back || row.is_matched
                  ? 'bg-emerald-600 text-white'
                  : 'bg-primary text-white hover:scale-[1.01] shadow-lg shadow-red-100'
              } ${isLiking ? 'opacity-65' : ''}`}
            >
              <Heart size={18} fill="currentColor" />
              {row.is_matched ? 'Match' : row.liked_back || isLiked ? 'Like envoye' : 'Liker en retour'}
            </button>

            <button
              onClick={onSuperLike}
              disabled={isSuperLiked || isSuperLiking}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 border-2 transition-all active:scale-95 disabled:cursor-not-allowed ${
                isSuperLiked
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-primary text-primary hover:bg-red-50'
              } ${isSuperLiking ? 'opacity-65' : ''}`}
            >
              <Star size={18} fill="currentColor" />
              {isSuperLiked ? 'Rose envoyee' : 'Envoyer une rose'}
            </button>

            {status === 'PENDING' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onRespond(row, 'IGNORE')}
                  disabled={isResponding}
                  className="py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-60"
                >
                  Ignorer
                </button>
                <button
                  onClick={() => onRespond(row, 'ACCEPT')}
                  disabled={isResponding}
                  className="py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-100 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-60"
                >
                  <Check size={16} />
                  Accepter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperLikeDetailModal;
