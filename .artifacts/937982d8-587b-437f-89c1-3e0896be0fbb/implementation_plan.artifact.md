# Monétisation de la Galerie (Vue Grille)

Ce plan vise à restreindre l'accès à la "Galerie" (Discover Grid) aux membres payants ou via un achat unique, tout en permettant à l'administrateur de configurer le prix du déblocage.

## Proposed Changes

### [Server] Configuration & Prix

#### [MODIFY] [constants.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/config/constants.js)
- Ajouter le prix par défaut `DISCOVER_GRID_UNLOCK: 1000` dans l'objet `PRICES`.

#### [MODIFY] [adminController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/adminController.js)
- Le contrôleur de tarification prendra automatiquement en compte le nouveau champ ajouté dans les constantes.

### [Server] Gestion des Droits

#### [MODIFY] [subscriptionService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/subscriptionService.js)
- Ajouter le cas `DISCOVER_GRID_UNLOCK` dans `applyPurchasedEntitlement` pour marquer le champ `is_grid_unlocked: true` dans le profil de l'utilisateur.

### [Web Mobile] Interface Utilisateur

#### [MODIFY] [AdminPricing.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminPricing.tsx)
- Ajouter le champ de saisie pour le prix du déblocage de la Galerie dans la section "Interactions".

#### [MODIFY] [DiscoverPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverPage.tsx)
- Modifier le comportement du bouton de bascule vers la grille :
    - Si l'utilisateur est Premium ou a déjà débloqué la grille : Navigation directe.
    - Si l'utilisateur est gratuit : Ouverture de la modal `InteractionPurchaseModal` avec le type `DISCOVER_GRID_UNLOCK`.

#### [MODIFY] [DiscoverGridPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverGridPage.tsx)
- Ajouter un garde-fou : Rediriger vers `/` (Swipe) si l'utilisateur n'a pas les droits d'accès à la grille.

#### [MODIFY] [InteractionPurchaseModal.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/InteractionPurchaseModal.tsx)
- Ajouter le support visuel et textuel pour le produit "Accès Galerie".

## User Review Required

> [!NOTE]
> **Privilège Premium** : Les membres Premium (Mensuel/Trimestriel) auront un accès **illimité et gratuit** à la Galerie par défaut. L'achat de 1000 F ne concerne que les membres "Classiques" qui souhaitent cette fonctionnalité spécifique sans s'abonner.

## Verification Plan

### Manual Verification
1.  **Admin** : Changer le prix du déblocage à 1500 F dans l'espace Admin et enregistrer.
2.  **Membre Classique** : Tenter d'ouvrir la Grille sur la page Découverte.
3.  Vérifier que la modal d'achat s'affiche avec le prix de 1500 F.
4.  Effectuer un achat de test.
5.  Vérifier que le bouton de Grille devient fonctionnel et permet d'accéder à la Galerie.
6.  **Membre Premium** : Vérifier que l'accès à la Galerie est direct et sans demande de paiement.
