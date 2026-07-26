# Correction du compteur de likes et synchronisation temps-réel

Ce plan vise à corriger le problème de mise à jour du compteur de likes lorsqu'un utilisateur reçoit un nouveau like.

## Problème identifié
Lorsqu'un utilisateur effectue un "Swipe Right" (Like), la relation est bien enregistrée dans la collection `likes`, mais le champ `likes_count` du profil de la personne likée n'est pas incrémenté. Par conséquent, certains écrans (notamment sur Web) affichent un compteur obsolète ou à zéro.

## Proposed Changes

### [Server] Logique de Matchmaking

#### [MODIFY] [matchmakingController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/matchmakingController.js)
- Dans la fonction `handleSwipe`, lors d'un Like réussi (direction RIGHT) :
    - Incrémenter atomiquement le champ `likes_count` dans le document `profiles` de l'utilisateur cible via `admin.firestore.FieldValue.increment(1)`.
    - Envoyer une notification push silencieuse ou une notification d'intérêt à l'utilisateur cible (si pertinent).

### [Web] Synchronisation UI

#### [MODIFY] [MatchesPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/MatchesPage.tsx)
- S'assurer que le compteur affiché dans les cartes "Likes Reçus" utilise une source de données fiable (soit l'API, soit le profil rafraîchi).

## Verification Plan

### Manual Verification
1.  Utiliser deux comptes de test (A et B).
2.  Noter le nombre de likes sur le compte B (ex: 0).
3.  Liker le compte B depuis le compte A.
4.  Vérifier sur le compte B que le compteur de likes passe instantanément (ou après rafraîchissement) à 1.
5.  Vérifier dans la console Firestore que le champ `likes_count` du profil B a bien été incrémenté.
