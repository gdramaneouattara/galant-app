# Filtrage par genre basé sur l'objectif de rencontre

Ce plan vise à implémenter une logique de filtrage par genre intelligente : les utilisateurs cherchant du sérieux ou le mariage ne verront que le sexe opposé, tandis que ceux cherchant l'amitié ou des rencontres décontractées verront tout le monde par défaut.

## User Review Required

> [!IMPORTANT]
> - L'objectif **MARRIAGE** est désormais traité avec la même rigueur que **SERIOUS**.
> - Le filtrage par âge et la vérification des abonnements resteront effectués en mémoire pour éviter de nouvelles erreurs d'index Firestore.

## Proposed Changes

### [Server] Logique de Matchmaking

#### [MODIFY] [matchmakingController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/matchmakingController.js)
- Mettre à jour la condition `isStrictGoal` pour inclure `SERIOUS` et `MARRIAGE`.
- Si `isStrictGoal` est vrai, forcer le filtrage sur le sexe opposé (Homme -> Femme, Femme -> Homme).
- Si l'objectif est `FRIENDSHIP` ou `CASUAL`, laisser le filtre de genre libre (utilise la valeur `ALL` par défaut du client).
- **Correctif permanent** : Supprimer l'inégalité sur `current_period_end` dans la requête Firestore des abonnements pour éliminer l'erreur 500 rapportée.

## Verification Plan

### Automated Tests
- Exécuter `npm run test:quality` pour s'assurer que les modifications respectent l'architecture globale.

### Manual Verification
1. Se connecter avec un profil Homme / Objectif : Mariage. Vérifier qu'on ne voit que des femmes.
2. Changer l'objectif en : Amitié. Vérifier qu'on voit des profils de tous genres.
3. Vérifier que l'erreur 500 sur les index n'apparaît plus.
