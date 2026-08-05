import React from 'react';
import { X, CreditCard, MessageCircle, Heart, LayoutGrid } from 'lucide-react';
import { useSubscription } from '@shared/hooks/useSubscription';
import { showAlert } from '@shared/lib/ui-bridge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: 'SUPER_LIKE' | 'DIRECT_MESSAGE' | 'LIKES_INBOX_2H' | 'DISCOVER_GRID_UNLOCK';
  targetId?: string;
  userName?: string;
  onSuccess: () => void;
}

const InteractionPurchaseModal: React.FC<Props> = ({ isOpen, onClose, type, targetId, userName, onSuccess }) => {
  const { purchaseWithPaystack, purchaseLoading } = useSubscription();

  if (!isOpen) return null;

  const handlePurchase = async () => {
    try {
      const amount = type === 'LIKES_INBOX_2H' || type === 'DISCOVER_GRID_UNLOCK' ? 1000 : 500;
      const ok = await purchaseWithPaystack(type, amount, targetId, { targetName: userName || (type === 'DISCOVER_GRID_UNLOCK' ? 'Accès Galerie' : 'Boite de Likes') });
      if (ok) {
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      showAlert('Erreur', error.message);
    }
  };

  const isSuperLike = type === 'SUPER_LIKE';
  const isLikesInbox = type === 'LIKES_INBOX_2H';
  const isGridUnlock = type === 'DISCOVER_GRID_UNLOCK';

  return (
    <div className="fixed inset-0 z-[220] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-white/5">
        <div className="p-8 text-center space-y-6">
          <div className="flex justify-end">
            <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full text-slate-300">
              <X size={20} />
            </button>
          </div>

          <div className={`w-20 h-20 mx-auto rounded-[2rem] flex items-center justify-center shadow-lg ${
            isSuperLike ? 'bg-rose-50 dark:bg-rose-900/20 shadow-rose-100 dark:shadow-none' :
            isLikesInbox ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500 shadow-amber-100 dark:shadow-none' :
            isGridUnlock ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 shadow-indigo-100 dark:shadow-none' :
            'bg-blue-50 dark:bg-blue-900/20 text-blue-500 shadow-blue-100 dark:shadow-none'
          }`}>
            {isSuperLike ? <span className="text-4xl">🌹</span> :
             isLikesInbox ? <Heart size={40} fill="currentColor" /> :
             isGridUnlock ? <LayoutGrid size={40} /> :
             <MessageCircle size={40} fill="currentColor" />}
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black italic text-slate-900 dark:text-white">
              {isSuperLike ? 'Offrir des Roses' :
               isLikesInbox ? 'Debloquer les Likes' :
               isGridUnlock ? 'Accès Galerie' :
               'Message prive'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
              {isLikesInbox
                ? "Accedez a l'integralite de vos likes recus pendant 2 heures et trouvez votre match immediatement."
                : isGridUnlock
                ? "Basculez sur la vue en grille pour parcourir tous les profils avec une efficacité maximale et sans limite."
                : <>Debloquez une discussion directe avec <span className="text-slate-900 dark:text-white font-bold">{userName}</span>.</>
              }
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
            <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tarif unique</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{isLikesInbox || isGridUnlock ? '1 000' : '500'} F CFA</p>
          </div>

          <button
            onClick={handlePurchase}
            disabled={purchaseLoading}
            className="w-full bg-primary text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-red-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {purchaseLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CreditCard size={18} />
                Payer par Carte ou Mobile Money
              </>
            )}
          </button>

          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
            Transaction securisee par Paystack
          </p>
        </div>
      </div>
    </div>
  );
};

export default InteractionPurchaseModal;
