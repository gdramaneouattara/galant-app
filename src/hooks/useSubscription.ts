import { useState, useCallback } from 'react';
import { apiRequest } from '../lib/api';
import { showAlert } from '../lib/ui-bridge';
import { openPaymentUrl } from '../lib/payment-bridge';

// Détection Web/Mobile
const isWeb = typeof window !== 'undefined' && !((window as any).expo);

export type PurchaseType = 'SUPER_LIKE' | 'DIRECT_MESSAGE' | 'BOOST' | 'PREMIUM' | 'PARTNER_PREMIUM' | 'ROSE_NOTE_UNLOCK' | 'STORY_UPLOAD' | 'LIKES_INBOX_2H' | 'DISCOVER_GRID_UNLOCK' | 'GOLDEN_ROSE' | 'ROSE_PACK' | 'PARTNER_DISCOVERY_UNLOCK' | 'DISCOVER_FILTERS_UNLOCK';
export type PaystackPaymentMethod = 'CARD' | 'MOBILE_MONEY' | 'CARD_MOBILE_MONEY';

export type WaveManualIntent = {
  status: 'PENDING';
  reference_code: string;
  amount: number;
  currency: string;
  payment_link: string;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  expires_at: string;
  instructions?: string[];
};

export const useSubscription = () => {
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [androidOfferTokenBySku, setAndroidOfferTokenBySku] = useState<Record<string, string>>({});

  const initIAP = useCallback(async (skus: string[], isSubscription = false) => {
    if (isWeb) return;
    try {
      // Pour l'instant on garde l'interface, la logique réelle est gérée par react-native-iap
      console.log('Initializing IAP for:', skus);
    } catch (err) {
      console.error('IAP Init Error:', err);
    }
  }, []);

  const endIAP = useCallback(async () => {
    if (isWeb) return;
    // Logique de clôture
  }, []);

  const purchaseWithPaystack = useCallback(async (
    type: PurchaseType,
    amount: number,
    targetId?: string,
    metadata?: any
  ): Promise<boolean> => {
    try {
      setPurchaseLoading(true);
      const currentPath = isWeb ? `${window.location.pathname}${window.location.search}` : '/profile';
      const callbackUrl = isWeb
        ? `${window.location.origin}/payment-return?next=${encodeURIComponent(currentPath)}`
        : undefined;
      const rawPaymentMethod = String(metadata?.paymentMethod || 'CARD_MOBILE_MONEY').toUpperCase();
      const requestedPaymentMethod: PaystackPaymentMethod = ['CARD', 'MOBILE_MONEY', 'CARD_MOBILE_MONEY'].includes(rawPaymentMethod)
        ? rawPaymentMethod as PaystackPaymentMethod
        : 'CARD_MOBILE_MONEY';
      const init = await apiRequest<{ authorization_url: string; reference: string }>(
        '/api/payments/initialize',
        {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({
            ...(metadata || {}),
            amount,
            type,
            targetId,
            paymentMethod: requestedPaymentMethod,
            callbackUrl,
            metadata: {
              ...(metadata || {}),
              paymentMethod: requestedPaymentMethod
            }
          }),
        }
      );

      const success = await openPaymentUrl(init.authorization_url);

      if (isWeb) {
        return false;
      }

      if (success) {
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

  const createWaveManualPayment = useCallback(async (
    type: PurchaseType,
    amount: number,
    targetId?: string,
    metadata?: any
  ): Promise<WaveManualIntent | null> => {
    try {
      setPurchaseLoading(true);
      return await apiRequest<WaveManualIntent>('/api/payments/wave/manual-intent', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          ...(metadata || {}),
          amount,
          type,
          targetId
        })
      });
    } catch (error: any) {
      showAlert('Erreur', error?.message || 'La commande Wave n a pas pu etre creee.');
      return null;
    } finally {
      setPurchaseLoading(false);
    }
  }, []);

  const submitWaveManualProof = useCallback(async (
    referenceCode: string,
    transactionId: string,
    phone: string
  ): Promise<boolean> => {
    try {
      setPurchaseLoading(true);
      await apiRequest('/api/payments/wave/manual-proof', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ referenceCode, transactionId, phone })
      });
      showAlert('Paiement en verification', 'Votre paiement Wave attend la validation admin.');
      return true;
    } catch (error: any) {
      showAlert('Erreur', error?.message || 'Impossible de soumettre la transaction Wave.');
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
      showAlert('Info', 'Veuillez utiliser le paiement Carte bancaire ou Mobile Money sur le Web.');
      return false;
    }
    // ... La logique Mobile restera accessible via un fichier séparé si nécessaire
    return false;
  }, []);

  return {
    purchaseLoading,
    purchaseWithPaystack,
    createWaveManualPayment,
    submitWaveManualProof,
    purchaseWithStore,
    initIAP,
    endIAP,
    androidOfferTokenBySku,
  };
};
