import React from 'react';
import { X, Heart, Flower2, MessageCircle, MapPin } from 'lucide-react';
import OptimizedImage from './OptimizedImage';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';
import ProfileFacts from './ProfileFacts';
import type { ProfileLanguage } from '@shared/lib/profileFacts';

export interface StatusLiker {
  user_id: string;
  created_at: string;
  liked_back?: boolean;
  is_matched?: boolean;
  profile: {
    id: string;
    name: string;
    age?: number | null;
    gender?: string | null;
    city?: string | null;
    country?: string | null;
    relationship_goal?: string | null;
    religion?: string | null;
    religion_other?: string | null;
    bio?: string;
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
  liker: StatusLiker | null;
  onLikeBack: (liker: StatusLiker) => void;
  onSuperLike: () => void;
  onDirectMessage: () => void;
  likingBackUserId: string | null;
  language?: ProfileLanguage;
}

const LikerProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  liker,
  onLikeBack,
  onSuperLike,
  onDirectMessage,
  likingBackUserId,
  language = 'fr',
}) => {
  if (!isOpen || !liker) return null;

  const photos = liker.profile.photos?.length ? liker.profile.photos : ['https://placehold.co/800x1000'];
  const isLikeDone = !!liker.liked_back || !!liker.is_matched;
  const location = [liker.profile.city, liker.profile.country].filter(Boolean).join(', ');

  return (
    <div className="fixed inset-0 z-[170] bg-slate-950/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 fade-in duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="text-xl font-black text-slate-950 truncate">
              {liker.profile.name}{typeof liker.profile.age === 'number' ? `, ${liker.profile.age}` : ''}
            </h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">
              A aime votre story
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(92vh-73px)] sm:max-h-[calc(88vh-73px)] p-5 space-y-5">
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {photos.map((photo, index) => (
              <OptimizedImage
                key={`${liker.user_id}-${index}`}
                src={optimizedPhotoUrl(photo, liker.profile.photo_variants, 'medium')}
                alt=""
                className="w-56 h-72 sm:w-60 sm:h-80 flex-shrink-0 rounded-xl object-cover bg-slate-100"
              />
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
              <MapPin size={16} className="text-primary" />
              <span>{location || 'Localisation non renseignee'}</span>
            </div>
            <ProfileFacts profile={liker.profile} language={language} includeStatus />

            {liker.profile.bio && (
              <p className="text-slate-700 leading-relaxed font-medium">
                {liker.profile.bio}
              </p>
            )}

            {(liker.profile.interests || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(liker.profile.interests || []).slice(0, 10).map((interest) => (
                  <span
                    key={`${liker.user_id}-${interest}`}
                    className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1">
            <button
              onClick={() => onLikeBack(liker)}
              disabled={isLikeDone || likingBackUserId === liker.user_id}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:cursor-not-allowed ${
                isLikeDone
                  ? 'bg-emerald-600 text-white'
                  : 'bg-primary text-white hover:scale-[1.01] shadow-lg shadow-red-100'
              } ${likingBackUserId === liker.user_id ? 'opacity-65' : ''}`}
            >
              <Heart size={18} fill="currentColor" />
              {liker.is_matched ? 'Match' : liker.liked_back ? 'Like envoye' : 'Liker en retour'}
            </button>

            <button
              onClick={onSuperLike}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 bg-white border-2 border-primary text-primary hover:bg-red-50 transition-all active:scale-95"
            >
              <Flower2 size={18} />
              Rose payante
            </button>

            <button
              onClick={onDirectMessage}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95"
            >
              <MessageCircle size={18} />
              Message direct payant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LikerProfileModal;
