# Synchronisation en temps réel du profil et des compteurs (Web)

Ce plan vise à rendre l'interface Web totalement réactive en utilisant des écouteurs Firestore (onSnapshot) pour le profil utilisateur. Cela permettra de voir les compteurs de likes et de roses se mettre à jour instantanément sans rafraîchir la page.

## Proposed Changes

### [Web] Authentification et Contexte

#### [MODIFY] [AuthContext.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/context/AuthContext.tsx)
- Remplacer l'appel unique `getDoc` par un écouteur `onSnapshot` sur le document de profil de l'utilisateur connecté.
- S'assurer que l'abonnement (listener) est correctement nettoyé lors de la déconnexion ou du changement d'utilisateur pour éviter les fuites de mémoire.

### [Web] Pages

#### [MODIFY] [MatchesPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/MatchesPage.tsx)
- Supprimer la logique de récupération manuelle des compteurs (`fetchCounts`) via les API.
- Utiliser directement `profile.likes_count` et `profile.roses_count` pour alimenter les cartes de notification en haut de la page.
- Cela garantit une mise à jour visuelle immédiate dès que le serveur incrémente les valeurs en base de données.

## Verification Plan

### Manual Verification
1.  Ouvrir deux navigateurs avec deux comptes différents (A et B).
2.  Aller sur l'onglet **Messages** avec le compte B.
3.  Liker le compte B avec le compte A depuis l'autre navigateur.
4.  Vérifier sur le compte B que le chiffre "Likes Reçus" passe de 0 à 1 **instantanément** et sans action manuelle.
5.  Faire de même avec une Rose (Super Like) et vérifier le compteur "Boîte de Roses".
