import React from 'react';
import { X, CreditCard, Film, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: () => void;
  loading: boolean;
}

const STORY_UPLOAD_PRICE = import.meta.env.VITE_STORY_UPLOAD_AMOUNT || '500';

const StoryPurchaseModal: React.FC<Props> = ({ isOpen, onClose, onPurchase, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-center">
        <div className="p-8 space-y-6">
          <div className="flex justify-end">
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-300 transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-primary shadow-lg shadow-red-500/10">
            <Film size={40} />
          </div>

          <div className="space-y-2">
            <h3 className="text-3xl font-black italic">Partager un moment</h3>
            <p className="text-slate-500 font-medium">Publiez une story visible pendant 24h par toute la communauté Galant.</p>
          </div>

          <div className="bg-amber-50 p-6 rounded-3xl inline-block mx-auto border border-amber-100">
             <p className="text-3xl font-black text-amber-600">{STORY_UPLOAD_PRICE} F CFA</p>
             <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">par story publiée</p>
          </div>

          <div className="space-y-3 pt-4">
            <button
              onClick={onPurchase}
              disabled={loading}
              className="w-full bg-[#09a5db] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <CreditCard size={20} />
                  Mobile Money
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              Peut-être plus tard
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-6">
          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
            Astuce : Les membres Premium bénéficient de publications illimitées et gratuites.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StoryPurchaseModal;
