import React from 'react';
import { X, Heart, MessageSquare, ShieldCheck, Gem, Loader2, Star } from 'lucide-react';

interface StatusLiker {
  user_id: string;
  created_at: string;
  liked_back?: boolean;
  is_matched?: boolean;
  profile: {
    id: string;
    name: string;
    photos: string[];
    is_verified?: boolean;
    is_premium?: boolean;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  likers: StatusLiker[];
  loading: boolean;
  onLikeBack: (liker: StatusLiker) => void;
  onDirectMessage: (liker: StatusLiker) => void;
}

const StatusLikersModal: React.FC<Props> = ({ isOpen, onClose, likers, loading, onLikeBack, onDirectMessage }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black italic">Admirateurs</h3>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Ils ont aimé votre story</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-300 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : likers.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                <Heart size={32} />
              </div>
              <p className="text-slate-400 font-bold text-sm">Pas encore de likes sur cette story.</p>
            </div>
          ) : (
            likers.map((liker) => (
              <div key={liker.user_id} className="bg-slate-50/50 p-4 rounded-3xl flex items-center gap-4 border border-slate-100/50">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                  <img src={liker.profile.photos?.[0] || 'https://placehold.co/100x100'} className="w-full h-full object-cover" alt="" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <p className="font-black text-slate-900 text-sm">{liker.profile.name}</p>
                    {liker.profile.is_verified && <ShieldCheck size={14} className="text-blue-500" />}
                    {liker.profile.is_premium && <Gem size={14} className="text-amber-500" />}
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                    {liker.is_matched ? 'Déjà un Match 🎉' : 'Vient de liker'}
                  </p>
                </div>

                <div className="flex gap-2">
                  {!liker.is_matched && (
                    <button
                      onClick={() => onLikeBack(liker)}
                      className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 hover:scale-110 active:scale-95 transition-all"
                    >
                      <Heart size={18} fill="currentColor" />
                    </button>
                  )}
                  <button
                    onClick={() => onDirectMessage(liker)}
                    className="w-10 h-10 bg-white text-slate-400 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm hover:text-primary transition-all"
                  >
                    <MessageSquare size={18} />
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
