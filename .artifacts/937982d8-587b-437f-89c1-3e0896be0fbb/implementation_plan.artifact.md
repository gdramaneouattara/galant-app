# Synchronisation Web <-> Mobile (Feature Parity)

Ce plan vise à porter toutes les fonctionnalités exclusives de la version mobile native vers la version Web afin d'offrir une expérience 100% identique sur tous les supports.

## Proposed Changes

### [Web Mobile] Nouvelles Fonctionnalités Utilisateurs

#### [NEW] [DiscoverGridPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverGridPage.tsx)
- Implémentation d'une vue en grille responsive (2 colonnes sur mobile, 4 sur desktop).
- Affichage des badges (Vérifié, Premium, Score) sur chaque miniature.
- Ajout d'un bouton de bascule sur `DiscoverPage.tsx` pour passer du Swipe à la Grille.

#### [NEW] [VenueDetailPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/VenueDetailPage.tsx)
- Page de présentation complète d'un partenaire.
- Galerie de photos, description riche, liste des avantages membres.
- Bouton "Discuter avec l'établissement".

---

### [Web Mobile] Nouvelles Fonctionnalités Admin & Partner

#### [NEW] [AdminMessaging.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminMessaging.tsx)
- Interface d'envoi de notifications push massives.
- Sélection de l'audience (Tous, Hommes uniquement, Femmes uniquement, Premium).

#### [NEW] [AdminVenues.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminVenues.tsx)
- Liste des établissements en attente d'approbation.
- Outils de validation des avantages partenaires.

#### [NEW] [AdminAuditLogs.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminAuditLogs.tsx)
- Historique des actions de modération et d'administration.

## Verification Plan

### Manual Verification
1.  Tester la bascule Swipe/Grid sur la page Découverte.
2.  Cliquer sur un établissement dans le Guide et vérifier l'ouverture de la page détail.
3.  Accéder aux nouveaux modules Admin et vérifier la cohérence des données avec la version mobile.
