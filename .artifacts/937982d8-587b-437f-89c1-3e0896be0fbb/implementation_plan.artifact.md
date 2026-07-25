# Implémentation de la véritable Boîte de Roses sur le Web

Ce plan vise à séparer la gestion des likes classiques et des Super Likes (Roses) sur la version Web, afin d'atteindre une parité fonctionnelle complète avec l'application mobile.

## Proposed Changes

### [Web Pages]

#### [NEW] [RosesInboxPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/RosesInboxPage.tsx)
- Créer une nouvelle page pour afficher les Super Likes reçus.
- Appeler l'endpoint `/api/super-likes/received`.
- Gérer l'affichage des cartes de Roses avec :
    - La photo (floutée si non Premium pour les hommes).
    - La note parfumée (si présente et débloquée).
    - Les actions : Accepter (Match) ou Ignorer.
- Intégrer la logique de déblocage de note via Paystack.

#### [MODIFY] [LikesInboxPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/LikesInboxPage.tsx)
- Renommer le titre de la page en "Likes Reçus".
- Garder uniquement la logique des likes standards (déjà fonctionnelle).

#### [MODIFY] [ProfilePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ProfilePage.tsx)
- Séparer le menu en deux entrées distinctes :
    1.  **Likes Reçus** (icône Cœur) -> redirige vers `/likes`.
    2.  **Boîte de Roses** (icône Rose 🌹) -> redirige vers `/roses`.

#### [MODIFY] [App.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/App.tsx)
- Ajouter la route `/roses` pointant vers `RosesInboxPage`.

## Verification Plan

### Manual Verification
1.  Aller sur le profil Web.
2.  Vérifier qu'il y a deux boutons : "Likes Reçus" et "Boîte de Roses".
3.  Cliquer sur "Likes Reçus" et voir les likes classiques.
4.  Cliquer sur "Boîte de Roses" et voir les Super Likes reçus avec leurs notes.
5.  Tester l'action "Accepter" sur une Rose et vérifier la création du match.
