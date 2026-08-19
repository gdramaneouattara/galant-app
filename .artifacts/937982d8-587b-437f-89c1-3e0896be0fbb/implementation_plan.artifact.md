# Système de Signalement (Version Web)

Ce plan vise à implémenter une fonctionnalité de signalement des utilisateurs directement dans l'interface Web de Galant, afin de renforcer la sécurité et la modération de la communauté.

## Proposed Changes

### [Web Mobile] Nouveaux Composants

#### [NEW] [ReportModal.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/ReportModal.tsx)
- Création d'une fenêtre modale élégante permettant de choisir un motif de signalement.
- Motifs inclus : Faux profil, Harcèlement, Contenu inapproprié, Arnaque, Autre.
- Champ de texte optionnel pour apporter des précisions.
- Bouton de soumission relié à l'API `/api/messages/report`.

### [Web Mobile] Intégration sur les Pages

#### [MODIFY] [ProfileDetailPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ProfileDetailPage.tsx)
- Ajouter un bouton "Signaler ce membre" en bas de la fiche détaillée.
- Design : Texte discret avec icône `ShieldAlert`, style épuré pour ne pas surcharger la page.
- Action : Ouvrir le `ReportModal`.

#### [MODIFY] [ChatPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ChatPage.tsx)
- Ajouter un bouton d'options (icône `ShieldAlert` ou `Flag`) dans le header du chat, à droite du nom.
- Action : Ouvrir le `ReportModal`.

## User Review Required

> [!IMPORTANT]
> **Modération instantanée** : Une fois le signalement envoyé, il apparaîtra immédiatement dans votre tableau de bord **Admin > Alertes**, vous permettant de suspendre le compte si nécessaire.

## Verification Plan

### Manual Verification
1.  Ouvrir le **Profil** d'un autre membre.
2.  Cliquer sur "Signaler ce membre" en bas de page.
3.  Choisir un motif (ex: "Faux Profil") et envoyer.
4.  Vérifier que le message de succès s'affiche.
5.  Aller dans une **Discussion** avec un membre.
6.  Cliquer sur l'icône de signalement dans le bandeau du haut.
7.  Vérifier que le signalement fonctionne également depuis cet endroit.
8.  **Admin** : Se rendre dans l'onglet "Alertes" pour confirmer la réception du signalement.
