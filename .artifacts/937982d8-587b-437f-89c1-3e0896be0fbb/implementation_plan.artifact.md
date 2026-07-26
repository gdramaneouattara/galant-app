# Correction du compteur de Roses (Super Likes)

Ce plan vise à assurer que le compteur de roses (`roses_count`) sur le profil d'un utilisateur est correctement incrémenté lorsqu'il reçoit un Super Like (une Rose).

## Problème identifié
Actuellement, seul le compteur de likes standards (`likes_count`) est incrémenté lors d'un swipe. Bien qu'un Super Like soit techniquement un like, il doit également alimenter le compteur de "Roses" affiché sur le profil pour refléter le prestige de l'utilisateur (le "Jardin de Roses").

## Proposed Changes

### [Server] Logique de Matchmaking

#### [MODIFY] [matchmakingController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/matchmakingController.js)
- Dans la fonction `handleSwipe`, si `isSuperLike` est vrai :
    - Incrémenter atomiquement le champ `roses_count` dans le document `profiles` de l'utilisateur cible.
    - Continuer d'incrémenter `likes_count` (car un Super Like reste un Like).

## Verification Plan

### Manual Verification
1.  Utiliser deux comptes (A et B).
2.  Noter le nombre de Roses sur le profil B (ex: 0).
3.  Envoyer un Super Like (Rose) depuis le compte A vers le compte B.
4.  Vérifier sur le profil B que le compteur de Roses est passé à 1.
5.  Vérifier également que le compteur de Likes est passé à 1.
