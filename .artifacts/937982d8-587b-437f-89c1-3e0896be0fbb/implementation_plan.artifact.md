# Remédiation : Alignement des tests et Diagnostic API

Ce plan vise à corriger les 5 échecs de tests introduits par la refactorisation du serveur et à finaliser le diagnostic de l'erreur 404 rencontrée lors de l'onboarding.

## User Review Required

> [!IMPORTANT]
> **Variable d'environnement manquante** : Le diagnostic actuel indique que `VITE_API_BASE_URL` est probablement vide lors du build. Vous devez vous assurer que cette variable est définie dans vos **GitHub Secrets** avec l'URL de votre backend Cloud Run.

## Proposed Changes

### [Server] Restauration de l'alignement des tests

#### [MODIFY] [index.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/index.js)
- Supprimer le helper `mountRoute` et restaurer les appels `app.use` explicites avec leurs variables respectives (`aiRoutes`, `messageRoutes`, etc.) car le moteur de test effectue une vérification textuelle stricte sur ces lignes.
- Conserver le gestionnaire de 404 à la fin du fichier pour le debugging.

### [Client] Diagnostic Final

#### [MODIFY] [api.ts](file:///C:/Users/UTILISATEUR/galant-app/src/lib/api.ts)
- Forcer l'affichage de l'URL absolue dans le message d'erreur pour confirmer si l'appel est relatif ou absolu.

## Verification Plan

### Automated Tests
- Lancer `npm run test:quality`. Tous les 70 tests doivent être au vert.

### Manual Verification
- Après déploiement, vérifier le message d'erreur sur mobile. S'il n'affiche pas de domaine (ex: `https://...`), la configuration des secrets GitHub doit être corrigée.
