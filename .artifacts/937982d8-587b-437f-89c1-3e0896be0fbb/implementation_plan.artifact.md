# Plan de correction : Erreur "app.firestore is not a function"

Les logs indiquent que l'objet `app` retourné par l'initialisation de Firebase n'expose pas les méthodes classiques (`.firestore()`, `.auth()`, etc.). Cela arrive avec les versions récentes du SDK Firebase Admin (v10+) qui privilégient une approche modulaire.

## User Review Required

> [!IMPORTANT]
> - Nous allons migrer la configuration Firebase vers le style "Modulaire" (`getFirestore(app)` au lieu de `app.firestore()`).
> - Ce style est beaucoup plus robuste et compatible avec toutes les versions récentes du SDK, évitant ainsi les erreurs "is not a function".

## Proposed Changes

### [Server] Migration Modulaire de Firebase

#### [MODIFY] [firebase.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/config/firebase.js)
- Importer les getters spécifiques pour chaque service : `getFirestore`, `getAuth`, `getDatabase`, `getStorage`.
- Initialiser les services en utilisant ces fonctions au lieu d'appeler des méthodes sur l'instance `app`.
- Simplifier la logique de détection des credentials pour Cloud Run.

## Verification Plan

### Manual Verification
1. Déployer sur Cloud Run.
2. Vérifier les logs : l'erreur `❌ Failed /api/... app.firestore is not a function` doit disparaître.
3. Consulter `/api/ping`. Si `mountErrors` affiche "none", le serveur est totalement opérationnel.
