import React from 'react';
import { X, CreditCard, MessageCircle, Heart } from 'lucide-react';
import { useSubscription } from '@shared/hooks/useSubscription';
import { showAlert } from '@shared/lib/ui-bridge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: 'SUPER_LIKE' | 'DIRECT_MESSAGE' | 'LIKES_INBOX_2H';
  targetId?: string;
  userName?: string;
  onSuccess: () => void;
}

const InteractionPurchaseModal: React.FC<Props> = ({ isOpen, onClose, type, targetId, userName, onSuccess }) => {
  const { purchaseWithPaystack, purchaseLoading } = useSubscription();

  if (!isOpen) return null;

  const handlePurchase = async () => {
    try {
      const amount = type === 'LIKES_INBOX_2H' ? 1000 : 500;
      const ok = await purchaseWithPaystack(type, amount, targetId, { targetName: userName || 'Boite de Likes' });
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

  return (
    <div className="fixed inset-0 z-[220] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center space-y-6">
          <div className="flex justify-end">
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-300">
              <X size={20} />
            </button>
          </div>

          <div className={`w-20 h-20 mx-auto rounded-[2rem] flex items-center justify-center shadow-lg ${
            isSuperLike ? 'bg-rose-50 shadow-rose-100' :
            isLikesInbox ? 'bg-amber-50 text-amber-500 shadow-amber-100' :
            'bg-blue-50 text-blue-500 shadow-blue-100'
          }`}>
            {isSuperLike ? <span className="text-4xl">🌹</span> :
             isLikesInbox ? <Heart size={40} fill="currentColor" /> :
             <MessageCircle size={40} fill="currentColor" />}
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black italic">
              {isSuperLike ? 'Offrir des Roses' :
               isLikesInbox ? 'Debloquer les Likes' :
               'Message prive'}
            </h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              {isLikesInbox
                ? "Accedez a l'integralite de vos likes recus pendant 2 heures et trouvez votre match immediatement."
                : <>Attirez immediatement l'attention de <span className="text-slate-900 font-bold">{userName}</span> avec cette attention d'exception.</>
              }
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tarif unique</span>
            <p className="text-2xl font-black text-slate-900">{isLikesInbox ? '1 000' : '500'} F CFA</p>
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
                Payer par Mobile Money
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
