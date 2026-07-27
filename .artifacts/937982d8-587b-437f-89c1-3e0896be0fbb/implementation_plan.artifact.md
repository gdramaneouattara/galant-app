# Correction des compteurs et Gestion Administrateur

Ce plan vise à résoudre les problèmes d'incrémentation des compteurs de Likes/Roses, à expliquer la logique d'attribution automatique de Roses, et à fournir les outils pour créer un compte administrateur.

## 1. Création d'un compte Administrateur

J'ai créé un script dédié pour promouvoir n'importe quel compte au rang d'administrateur.

### Procédure :
1.  Récupérez l'**UID** de votre compte (disponible dans la console Firebase > Authentication).
2.  Exécutez la commande suivante dans votre terminal à la racine du projet :
    ```bash
    node scripts/make-admin.js VOTRE_UID_ICI
    ```
3.  Une fois fait, votre onglet "Moi" affichera un bouton "Admin" sur le Web et débloquera les fonctionnalités de gestion.

## 2. Problème des compteurs (Likes / Roses)

Les compteurs ne s'incrémentaient pas à cause d'une instabilité dans l'utilisation des transactions atomiques sur certains environnements.

### Proposed Changes
- **Simplification de `handleSwipe`** : Remplacer la transaction complexe par une mise à jour directe et sécurisée du document de profil pour garantir l'incrémentation systématique.
- **Vérification de l'import** : M'assurer que `FieldValue` est utilisé via `admin.firestore.FieldValue` pour une compatibilité maximale avec le serveur Cloud Run.

## 3. Attribution automatique d'une Rose

Le fait qu'un utilisateur reçoive une rose à la création n'est pas un bug, mais une **fonctionnalité de bienvenue** :
- **Règle actuelle** : Si un profil est complété à 100% (Rayonnement Galant), le système offre automatiquement **1 Rose d'Or** pour récompenser l'élégance et encourager la première rencontre.
- **Action** : Je vais ajouter un journal de bord (Log) clair dans le code pour que cette récompense soit traçable.

## Verification Plan

### Manual Verification
1.  Promouvoir un compte en Admin via le script.
2.  Vérifier l'accès au Dashboard Admin.
3.  Liker un profil et vérifier l'incrémentation immédiate sur le destinataire.
4.  Compléter un profil à 100% et vérifier la notification de Rose offerte.
