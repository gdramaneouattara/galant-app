# Walkthrough : Déblocage Temporaire des Likes (2h)

J'ai implémenté une nouvelle option de monétisation flexible permettant aux utilisateurs de débloquer l'accès à leur boîte de likes pendant 2 heures pour un tarif unique de 1 000 F CFA.

## Changements effectués

### [Serveur]
- **Configuration** : Ajout du prix `LIKES_INBOX_2H` (1 000 F) dans les constantes du système.
- **Logique d'Entitlement** : Implémentation d'une nouvelle règle de droit d'accès. Lors du paiement, le champ `likes_unlocked_until` du profil utilisateur est mis à jour à `Maintenant + 2 heures`.
- **Contrôle d'Accès** : La récupération des likes reçus autorise désormais l'accès si l'abonnement Premium est actif OU si le déblocage temporaire est toujours valide.

### [Web]
- **[LikesInboxPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/LikesInboxPage.tsx)** :
    - Ajout d'un bouton "Accès 2h (1 000 F)" sur l'écran de verrouillage des likes.
    - Intégration de la modal de paiement Paystack dédiée.
- **[InteractionPurchaseModal.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/InteractionPurchaseModal.tsx)** :
    - Support visuel complet pour le type de déblocage (icône cœur, description explicative, prix spécifique).

### [Mobile]
- **[LikesInboxScreen.tsx](file:///C:/Users/UTILISATEUR/galant-app/src/screens/premium/LikesInboxScreen.tsx)** :
    - Refonte de l'écran verrouillé pour inclure l'option de déblocage 2h avec une icône de carte bancaire et un bouton d'action secondaire élégant.
    - Intégration du flux de paiement via le hook `useSubscription`.

## Résultats de la Vérification

### Tests Qualité
- **Statut** : 100% Succès (70/70 tests).
- La logique de calcul du temps restant et de validation du prix est confirmée.

### Déploiement
- Les modifications sont synchronisées et actives sur les branches **staging** et **main**.

> [!TIP]
> Cette option est idéale pour convertir les utilisateurs gratuits qui reçoivent une notification de like. Ils peuvent désormais voir qui les apprécie instantanément pour une somme modique, sans s'engager sur un mois complet.
