# Synchronisation Web <-> Mobile (Feature Parity - Phase 2)

Ce plan vise à porter les fonctionnalités utilisateurs et administratives restantes de la version mobile native vers la version Web, garantissant une parité fonctionnelle totale.

## Proposed Changes

### [Web Mobile] Nouvelles Fonctionnalités Utilisateurs & Partenaires

#### [NEW] [VenueDetailPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/VenueDetailPage.tsx)
- **Objectif** : Remplacer l'absence de fiche établissement détaillée sur le Web.
- **Fonctionnalités** :
    - Galerie d'images responsive.
    - Affichage des avantages "Signature Galant".
    - Lien d'itinéraire vers Google Maps.
    - Bouton "Contacter l'hôte" ouvrant un thread de discussion dédié.

#### [NEW] [PartnerPremiumPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/PartnerPremiumPage.tsx)
- **Objectif** : Permettre aux partenaires de gérer leur visibilité depuis le Web.
- **Fonctionnalités** :
    - Comparatif des plans "Visibilité" et "Prestige".
    - Tunnel de paiement intégré (identique au mode Premium utilisateur).

---

### [Web Mobile] Modules Admin (Poste de Commandement)

#### [NEW] [AdminMessaging.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminMessaging.tsx)
- **Fonctionnalité** : Interface d'envoi de messages système (broadcast) par segment (Premium, Sexe, Tous).

#### [NEW] [AdminVenues.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminVenues.tsx)
- **Fonctionnalité** : Tableau de bord de validation des nouveaux établissements partenaires.

#### [NEW] [AdminAuditLogs.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminAuditLogs.tsx)
- **Fonctionnalité** : Journal de traçabilité des actions administratives pour la sécurité.

---

### [Shared] Navigation Web

#### [MODIFY] [App.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/App.tsx)
- Enregistrer les nouvelles routes : `/venue/:id`, `/partner-premium`, `/admin/messaging`, `/admin/venues`, `/admin/audit`.

## User Review Required

> [!NOTE]
> L'ajout de ces pages complète l'écosystème Galant Web. Les outils Admin sont placés en fin d'implémentation comme demandé, pour privilégier d'abord l'expérience des partenaires et des membres.

## Verification Plan

### Manual Verification
1.  Cliquer sur un restaurant dans le **Guide Galant** et vérifier l'affichage de la fiche détaillée.
2.  Accéder à l'espace partenaire et tester l'ouverture de la page d'abonnement.
3.  Vérifier que les nouvelles routes Admin sont bien protégées par le garde-fou `requireAdmin`.
