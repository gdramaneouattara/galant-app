import { useState, useCallback } from 'react';
import { apiRequest } from '../lib/api';
import { showAlert } from '../lib/ui-bridge';
import { openPaymentUrl } from '../lib/payment-bridge';

// Détection Web/Mobile
const isWeb = typeof window !== 'undefined' && !((window as any).expo);

export type PurchaseType = 'SUPER_LIKE' | 'DIRECT_MESSAGE' | 'BOOST' | 'PREMIUM' | 'ROSE_NOTE_UNLOCK';

export const useSubscription = () => {
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const purchaseWithPaystack = useCallback(async (
    type: PurchaseType,
    amount: number,
    targetId?: string,
    metadata?: any
  ): Promise<boolean> => {
    try {
      setPurchaseLoading(true);
      const init = await apiRequest<{ authorization_url: string; reference: string }>(
        '/api/payments/initialize',
        {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({
            amount,
            type,
            targetId,
            paymentMethod: 'MOBILE_MONEY',
            metadata
          }),
        }
      );

      const success = await openPaymentUrl(init.authorization_url);

      if (success || isWeb) {
        // Sur le web, on attend le retour de Paystack ou on vérifie au prochain chargement
        const verify = await apiRequest<{ status: string }>(
          `/api/payments/verify?reference=${init.reference}`,
          { requireAuth: true }
        );
        return verify.status === 'active';
      }
      return false;
    } catch (error: any) {
      showAlert('Erreur', error?.message || 'Le paiement n\'a pas pu être initialisé.');
      return false;
    } finally {
      setPurchaseLoading(false);
    }
  }, []);

  // La logique IAP est désactivée sur Web
  const purchaseWithStore = useCallback(async (
    sku: string,
    type: PurchaseType,
    targetId?: string,
    isSubscription = false,
    offerToken?: string
  ): Promise<boolean> => {
    if (isWeb) {
      showAlert('Info', 'Veuillez utiliser le paiement Mobile Money sur le Web.');
      return false;
    }
    // ... La logique Mobile restera accessible via un fichier séparé si nécessaire
    return false;
  }, []);

  return {
    purchaseLoading,
    purchaseWithPaystack,
    purchaseWithStore,
  };
};
