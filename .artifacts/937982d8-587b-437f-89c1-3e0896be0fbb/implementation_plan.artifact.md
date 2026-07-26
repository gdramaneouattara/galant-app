# Ouverture gratuite de la Boîte de Roses

Ce plan vise à rendre la consultation des Roses reçues (Super Likes) totalement gratuite pour tous les utilisateurs. Puisque l'expéditeur a déjà payé pour envoyer une Rose, le destinataire doit pouvoir en apprécier le contenu (photo et note parfumée) sans barrière financière.

## User Review Required

> [!IMPORTANT]
> - L'identité de l'expéditeur (nom et photos) ne sera plus floutée pour les hommes non-Premium.
> - La "Note Parfumée" jointe à une Rose sera lisible instantanément et gratuitement par tous.
> - L'option d'achat de déblocage de note sera supprimée car elle devient obsolète.

## Proposed Changes

### [Serveur] Logique de Matchmaking

#### [MODIFY] [matchmakingController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/matchmakingController.js)
- Dans `getSuperLikesReceived`, supprimer la logique de verrouillage `isLocked`.
- Toujours renvoyer le profil complet (`senderProfile`) et définir `is_locked: false`.
- Supprimer la vérification des achats `ROSE_NOTE_UNLOCK`.

### [Web] Interface Utilisateur

#### [MODIFY] [RosesInboxPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/RosesInboxPage.tsx)
- Supprimer l'état `unlockingId` et la fonction `handleUnlockNote`.
- Retirer le rendu conditionnel basé sur `row.is_locked` (plus de flou, plus de bouton "Débloquer").
- Afficher directement le nom, la photo et la note parfumée.

### [Mobile] Interface Utilisateur

#### [MODIFY] [SuperLikeCard.tsx](file:///C:/Users/UTILISATEUR/galant-app/src/screens/premium/components/SuperLikeCard.tsx)
- Supprimer le style `lockedCard` et les overlays de verrouillage.
- Toujours afficher l'âge et la ville du profil.
- Remplacer le bloc `lockedNoteBox` par l'affichage direct de la note.

#### [MODIFY] [LikesReceivedScreen.tsx](file:///C:/Users/UTILISATEUR/galant-app/src/screens/premium/LikesReceivedScreen.tsx)
- Supprimer la fonction `handleUnlockNote` et les états de chargement associés.

## Verification Plan

### Manual Verification
1.  Utiliser un compte Homme non-Premium.
2.  Lui envoyer une Rose (Super Like) depuis un autre compte.
3.  Vérifier que l'homme peut voir la photo nette et lire la note parfumée sans payer.
4.  Confirmer qu'aucun bouton "Débloquer" n'apparaît.
5.  Vérifier que l'action "Accepter" fonctionne toujours parfaitement pour créer le match.
