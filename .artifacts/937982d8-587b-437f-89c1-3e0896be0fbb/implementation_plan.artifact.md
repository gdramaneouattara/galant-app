# Résolution de l'écran blanc sur mobile (Web Staging)

Ce plan vise à corriger l'erreur d'écran blanc rencontrée sur téléphone lors de l'accès à la version de staging (GitHub Pages). Les causes probables identifiées sont des chemins d'accès aux assets incorrects (Base URL), des variables d'environnement manquantes lors du build, et des crashs potentiels dus à l'accès à `process.env` dans un environnement navigateur.

## User Review Required

> [!IMPORTANT]
> - Vérifiez que les **GitHub Secrets** (VITE_FIREBASE_API_KEY, etc.) sont bien configurés dans votre dépôt GitHub. Sans eux, le build de staging échouera à l'initialisation de Firebase.
> - Confirmez que l'URL de staging est bien `https://[votre-nom].github.io/galant-app/`. Si le nom du dépôt est différent, la variable `base` dans `vite.config.ts` devra être ajustée.

## Proposed Changes

### [Vite Configuration]

#### [MODIFY] [vite.config.ts](file:///C:/Users/UTILISATEUR/galant-app/web/vite.config.ts)
- Utiliser une base relative ou s'assurer que le mode `staging` est correctement géré.
- Ajouter un shim pour `process.env` afin d'éviter les `ReferenceError`.

### [CI/CD Pipeline]

#### [MODIFY] [deploy-web.yml](file:///C:/Users/UTILISATEUR/galant-app/.github/workflows/deploy-web.yml)
- Forcer le mode de build à `staging` pour que Vite utilise la bonne configuration de base et les bonnes variables d'environnement.

### [Shared Library Safety]

#### [MODIFY] [api.ts](file:///C:/Users/UTILISATEUR/galant-app/src/lib/api.ts)
- Sécuriser l'accès à `process.env` pour éviter les crashs dans le bundle Web.

### [Web Application Core]

#### [MODIFY] [AuthContext.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/context/AuthContext.tsx)
- Ajouter des blocs try/catch autour des appels asynchrones dans `onAuthStateChanged` pour éviter que `loading` ne reste bloqué à `true` en cas d'erreur.

#### [MODIFY] [App.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/App.tsx)
- Ajouter un composant `ErrorBoundary` pour capturer les erreurs au rendu et afficher un message utile au lieu d'un écran blanc.
- Corriger les chemins d'images absolus (`/auth-bg.png`) pour qu'ils fonctionnent sur GitHub Pages.

## Verification Plan

### Manual Verification
1.  Pousser les modifications sur la branche `staging`.
2.  Vérifier le succès du workflow GitHub Actions.
3.  Tester sur téléphone :
    - Si l'écran blanc persiste, l'ErrorBoundary devrait maintenant afficher un message d'erreur.
    - Vérifier dans la console du navigateur mobile (via inspecteur distant ou via un outil comme VConsole si nécessaire) les erreurs 404 ou JS.
