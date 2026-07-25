# Parité des actions de découverte sur le Web

Ce plan vise à unifier les actions de l'écran Découverte sur la version Web avec celles de l'application mobile, en ajoutant les fonctions de Message Direct et de Super Like.

## User Review Required

> [!IMPORTANT]
> L'implémentation inclura l'ouverture de la modal d'achat d'interaction si l'utilisateur n'est pas Premium ou s'il a épuisé ses quotas gratuits.

## Proposed Changes

### [Web Components]

#### [MODIFY] [DiscoverPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverPage.tsx)
- Ajouter le bouton **Message Direct** (icône `MessageCircle`) entre le `X` et la `Rose`.
- Remplacer l'icône **Rocket** (Fusée) par une **Rose** (icône `Star` ou texte 🌹) pour le Super Like.
- Implémenter la logique `handleSuperLike` :
    - Vérifier les quotas via le serveur.
    - Ouvrir `InteractionPurchaseModal` si nécessaire.
- Implémenter la logique `handleDirectMessage` :
    - Vérifier si l'utilisateur peut envoyer un message direct (Premium ou achat).
    - Ouvrir la modal d'achat ou rediriger vers `/chat/:userId`.

### [Shared Hooks]

#### [MODIFY] [useMatchmaking.ts](file:///C:/Users/UTILISATEUR/galant-app/src/hooks/useMatchmaking.ts)
- S'assurer que `handleSwipe` accepte un paramètre `isSuperLike` (déjà présent mais à valider).

## Verification Plan

### Manual Verification
1. Aller sur l'écran Découverte sur le Web.
2. Vérifier que les 4 boutons sont présents (Passer, Message, Super Like, Like).
3. Cliquer sur la Rose et vérifier l'ouverture de la modal d'achat (si non Premium).
4. Cliquer sur le Message et vérifier la redirection vers le chat ou la modal d'achat.
