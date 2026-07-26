# Réconciliation historique des compteurs de Likes et Roses

Ce plan vise à synchroniser les compteurs `likes_count` et `roses_count` de tous les profils existants en comptabilisant réellement les interactions présentes dans la collection `likes` de Firestore.

## User Review Required

> [!IMPORTANT]
> - Cette opération va écraser les valeurs actuelles des compteurs par la réalité du terrain (comptage manuel de la collection `likes`).
> - L'opération peut prendre quelques secondes selon le nombre d'utilisateurs en base.

## Proposed Changes

### [Server] Administration et Maintenance

#### [MODIFY] [adminController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/adminController.js)
- Implémenter une nouvelle fonction `reconcileCounters` :
    - Récupérer tous les documents de la collection `profiles`.
    - Pour chaque profil :
        - Compter les documents dans `likes` où `liked_id` correspond à l'utilisateur.
        - Séparer les likes standards des Super Likes (`is_super_like: true`).
        - Mettre à jour le document `profiles` avec les totaux exacts.
- Exporter la fonction.

#### [MODIFY] [adminRoutes.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/routes/adminRoutes.js)
- Ajouter la route `POST /api/admin/users/reconcile-counters` pointant vers la nouvelle fonction.

### [Web] Interface Admin

#### [MODIFY] [AdminDashboard.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminDashboard.tsx)
- Ajouter un bouton "Réconcilier les compteurs" dans la section maintenance pour permettre à l'administrateur de lancer cette tâche manuellement.

## Verification Plan

### Manual Verification
1.  Identifier un utilisateur qui a des likes en base mais un compteur à zéro.
2.  Se connecter en tant qu'admin.
3.  Lancer la réconciliation depuis le dashboard.
4.  Vérifier que le compteur de l'utilisateur a été mis à jour correctement.
