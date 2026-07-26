# Déblocage temporaire de la boîte des likes (2h)

Ce plan vise à offrir une alternative à l'abonnement Premium en permettant aux utilisateurs de débloquer l'accès à leur boîte de likes pendant une durée limitée (2 heures) via un paiement unique de 1000 F CFA.

## User Review Required

> [!IMPORTANT]
> - Le prix est fixé à **1000 F CFA** pour **2 heures** d'accès total.
> - Cette option est idéale pour les utilisateurs qui reçoivent beaucoup de likes ponctuellement mais ne souhaitent pas s'abonner au mois.

## Proposed Changes

### [Server] Configuration et Prix

#### [MODIFY] [constants.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/config/constants.js)
- Ajouter `LIKES_INBOX_2H: 1000` dans l'objet `PRICES`.

#### [MODIFY] [paymentHelpers.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/utils/paymentHelpers.js)
- Gérer le type `LIKES_INBOX_2H` dans `getExpectedAmountForPurchase`.

### [Server] Logique d'accès

#### [MODIFY] [subscriptionService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/subscriptionService.js)
- Dans `applyPurchasedEntitlement`, ajouter le cas `LIKES_INBOX_2H` pour mettre à jour le champ `likes_unlocked_until` (now + 2h) dans le document `profiles`.

#### [MODIFY] [matchmakingController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/matchmakingController.js)
- Mettre à jour `getLikesReceived` pour autoriser l'accès si `likes_unlocked_until` est dans le futur.

### [Web] Interface Utilisateur

#### [MODIFY] [LikesInboxPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/LikesInboxPage.tsx)
- Afficher un bouton "Débloquer l'accès (2h) - 1000 F" sur l'écran de verrouillage.
- Intégrer l'appel à `InteractionPurchaseModal`.

#### [MODIFY] [InteractionPurchaseModal.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/InteractionPurchaseModal.tsx)
- Ajouter le support visuel (icône, textes) pour le type `LIKES_INBOX_2H`.

### [Mobile] Interface Utilisateur

#### [MODIFY] [LikesInboxScreen.tsx](file:///C:/Users/UTILISATEUR/galant-app/src/screens/premium/LikesInboxScreen.tsx)
- Ajouter le bouton de déblocage temporaire sur l'écran verrouillé.
- Gérer le processus de paiement via Paystack.

## Verification Plan

### Manual Verification
1. Tenter d'accéder à la boîte de likes avec un compte gratuit.
2. Vérifier la présence de l'option "Débloquer pour 2h".
3. Simuler/Effectuer un paiement Paystack.
4. Confirmer que la boîte devient consultable immédiatement.
5. Vérifier que l'accès expire bien après 2h (via modification manuelle en base).
