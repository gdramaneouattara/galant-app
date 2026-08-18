# Monétisation des Filtres Découverte (Accès 3 jours)

Ce plan vise à transformer les filtres de recherche en une fonctionnalité payante (500 F CFA pour 3 jours) ou réservée aux membres Premium, avec un contrôle total pour l'administrateur.

## Proposed Changes

### [Server] Configuration et Logique Métier

#### [MODIFY] [constants.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/config/constants.js)
- Ajouter `DISCOVER_FILTERS_UNLOCK: 500` dans `PRICES`.
- Ajouter `DISCOVER_FILTERS_DURATION_DAYS: 3` dans un nouvel objet `DURATIONS` (ou dans `PRICES` pour faciliter la gestion Admin).

#### [MODIFY] [subscriptionService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/subscriptionService.js)
- Implémenter le traitement de l'achat `DISCOVER_FILTERS_UNLOCK`.
- Calculer la date d'expiration (`maintenant + X jours`).
- Mettre à jour le profil avec `filters_unlocked_until`.

### [Web Mobile] Interface Administrateur

#### [MODIFY] [AdminPricing.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminPricing.tsx)
- Ajouter deux nouveaux champs dans la section "Interactions" :
    - **Prix du déblocage des filtres** (F CFA).
    - **Durée du déblocage** (en jours).

### [Web Mobile] Interface Utilisateur

#### [MODIFY] [InteractionPurchaseModal.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/InteractionPurchaseModal.tsx)
- Ajouter le type d'achat `DISCOVER_FILTERS_UNLOCK`.
- Personnaliser le texte : *"Ciblez vos rencontres avec précision par ville et par âge pendant 3 jours."*
- Récupérer dynamiquement la durée et le prix depuis les paramètres (si possible) ou utiliser les constantes.

#### [MODIFY] [DiscoverPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverPage.tsx)
- **Vérification d'accès** : Avant d'ouvrir les filtres, vérifier si :
    - `profile.is_premium === true`
    - OU `profile.filters_unlocked_until` est dans le futur.
- **Redirection** : Si aucun accès, ouvrir le modal d'achat.

#### [MODIFY] [StorePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/StorePage.tsx)
- Ajouter l'option "Pass Filtres (3 jours)" dans la section des déblocages.

## User Review Required

> [!NOTE]
> **Expérience Utilisateur** : Le bouton de filtrage sur l'écran découverte affichera un petit cadenas 🔒 pour les membres non-premium n'ayant pas encore acheté l'accès, afin d'indiquer clairement que c'est un privilège.

## Verification Plan

### Manual Verification
1.  **Admin** : Changer le prix à 600 F et la durée à 5 jours dans l'espace Admin. Enregistrer.
2.  **Utilisateur Classique** : Tenter d'ouvrir les filtres. Vérifier que le prix affiché est bien 600 F et que le texte mentionne "5 jours".
3.  **Achat** : Simuler l'achat. Vérifier que le champ `filters_unlocked_until` est bien mis à jour dans la base de données.
4.  **Accès** : Vérifier que les filtres s'ouvrent normalement après l'achat.
