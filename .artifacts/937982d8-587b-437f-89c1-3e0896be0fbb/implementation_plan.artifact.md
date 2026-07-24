# Plan de Diagnostic Final : Extraction des mountErrors

Le serveur Cloud Run indique que la route n'est pas trouvée. Nous devons maintenant voir l'erreur de chargement qui est cachée dans le champ `mountErrors` de la réponse 404.

## User Review Required

> [!IMPORTANT]
> Nous allons modifier l'application pour qu'elle affiche le contenu brut de l'erreur serveur. Une fois le déploiement terminé, la prochaine erreur 404 sera beaucoup plus bavarde et nous donnera la cause racine (ex: "Cannot find module X" ou "SyntaxError at line Y").

## Proposed Changes

### [Client] Diagnostic bavard

#### [MODIFY] [api.ts](file:///C:/Users/UTILISATEUR/galant-app/src/lib/api.ts)
- Améliorer `apiRequest` pour que le message d'erreur inclue le contenu JSON complet si un champ `mountErrors` est détecté.

### [Server] Route de secours

#### [MODIFY] [index.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/index.js)
- Ajouter `app.get('/api/ping', (req, res) => res.json({ status: 'ok', mountErrors }));` pour permettre un diagnostic direct via navigateur.

## Verification Plan

### Manual Verification
1. Déployer et cliquer sur "J'adhère aux valeurs".
2. Lire le nouveau message d'erreur.
3. Alternativement, ouvrir `https://galant-backend-756651030930.europe-west4.run.app/api/ping` dans un navigateur pour voir la liste des erreurs de chargement.
