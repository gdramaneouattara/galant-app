import React from 'react';
import { X, CreditCard, MessageCircle, Heart, LayoutGrid, SlidersHorizontal as FiltersIcon } from 'lucide-react';
import { useSubscription } from '@shared/hooks/useSubscription';
import { showAlert } from '@shared/lib/ui-bridge';
import { useAuth } from '../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: 'SUPER_LIKE' | 'DIRECT_MESSAGE' | 'LIKES_INBOX_2H' | 'DISCOVER_GRID_UNLOCK' | 'DISCOVER_FILTERS_UNLOCK';
  targetId?: string;
  userName?: string;
  durationDays?: number;
  price?: number;
  onSuccess: () => void;
}

const copy = {
  fr: {
    error: 'Erreur',
    galleryTarget: 'Accès Galerie',
    likesTarget: 'Boite de Likes',
    filtersTarget: 'Pass Filtres',
    roses: 'Offrir des Roses',
    likes: 'Débloquer les Likes',
    gallery: 'Accès Galerie',
    filters: 'Débloquer les Filtres',
    dm: 'Message privé',
    likesBody: "Accédez à l'intégralité de vos likes reçus pendant 2 heures et trouvez votre match immédiatement.",
    galleryBody: 'Basculez sur la vue en grille pour parcourir plus de profils avec une efficacité maximale.',
    filtersBody: 'Ciblez vos rencontres avec précision par ville et par âge.',
    dmPrefix: 'Débloquez une discussion directe avec',
    price: 'Tarif unique',
    pay: 'Payer par Carte ou Mobile Money',
    secured: 'Transaction sécurisée par Paystack',
    validity: (days: number) => `Valable ${days} jour${days > 1 ? 's' : ''}`
  },
  en: {
    error: 'Error',
    galleryTarget: 'Gallery Access',
    likesTarget: 'Likes Inbox',
    filtersTarget: 'Filters Pass',
    roses: 'Send Roses',
    likes: 'Unlock Likes',
    gallery: 'Gallery Access',
    filters: 'Unlock Filters',
    dm: 'Private message',
    likesBody: 'Access all your received likes for 2 hours and find your match immediately.',
    galleryBody: 'Switch to grid view to browse all profiles efficiently and without limits.',
    filtersBody: 'Target your matches precisely by city and age.',
    dmPrefix: 'Unlock a direct conversation with',
    price: 'Single price',
    pay: 'Pay by Card or Mobile Money',
    secured: 'Secure transaction by Paystack',
    validity: (days: number) => `Valid for ${days} day${days > 1 ? 's' : ''}`
  }
};

const InteractionPurchaseModal: React.FC<Props> = ({ isOpen, onClose, type, targetId, userName, durationDays, price, onSuccess }) => {
  const { purchaseWithPaystack, purchaseLoading } = useSubscription();
  const { language } = useAuth();
  const c = copy[language] || copy.fr;

  if (!isOpen) return null;

  const handlePurchase = async () => {
    try {
      const amount = price || (type === 'LIKES_INBOX_2H' || type === 'DISCOVER_GRID_UNLOCK' ? 1000 : 500);
      const ok = await purchaseWithPaystack(type, amount, targetId, {
        targetName: userName || (type === 'DISCOVER_GRID_UNLOCK' ? c.galleryTarget : type === 'DISCOVER_FILTERS_UNLOCK' ? c.filtersTarget : c.likesTarget)
      });
      if (ok) {
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      showAlert(c.error, error.message);
    }
  };

  const isSuperLike = type === 'SUPER_LIKE';
  const isLikesInbox = type === 'LIKES_INBOX_2H';
  const isGridUnlock = type === 'DISCOVER_GRID_UNLOCK';
  const isFiltersUnlock = type === 'DISCOVER_FILTERS_UNLOCK';

  const title = isSuperLike ? c.roses : isLikesInbox ? c.likes : isGridUnlock ? c.gallery : isFiltersUnlock ? c.filters : c.dm;

  return (
    <div className="fixed inset-0 z-[220] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-white/5">
        <div className="p-8 text-center space-y-6">
          <div className="flex justify-end">
            <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full text-slate-300" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className={`w-20 h-20 mx-auto rounded-[2rem] flex items-center justify-center shadow-lg ${
            isSuperLike ? 'bg-rose-50 dark:bg-rose-900/20 shadow-rose-100 dark:shadow-none' :
            isLikesInbox ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500 shadow-amber-100 dark:shadow-none' :
            isGridUnlock ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 shadow-indigo-100 dark:shadow-none' :
            isFiltersUnlock ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 shadow-purple-100 dark:shadow-none' :
            'bg-blue-50 dark:bg-blue-900/20 text-blue-500 shadow-blue-100 dark:shadow-none'
          }`}>
            {isSuperLike ? <span className="text-4xl">🌹</span> :
             isLikesInbox ? <Heart size={40} fill="currentColor" /> :
             isGridUnlock ? <LayoutGrid size={40} /> :
             isFiltersUnlock ? <FiltersIcon size={40} /> :
             <MessageCircle size={40} fill="currentColor" />}
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black  text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
              {isLikesInbox
                ? c.likesBody
                : isGridUnlock
                ? c.galleryBody
                : isFiltersUnlock
                ? c.filtersBody
                : <>{c.dmPrefix} <span className="text-slate-900 dark:text-white font-bold">{userName}</span>.</>
              }
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
            <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{c.price}</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {price || (isLikesInbox || isGridUnlock ? '1 000' : '500')} F CFA
            </p>
            {durationDays && (
               <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">
                 {c.validity(durationDays)}
               </p>
            )}
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
                {c.pay}
              </>
            )}
          </button>

          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
            {c.secured}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InteractionPurchaseModal;
