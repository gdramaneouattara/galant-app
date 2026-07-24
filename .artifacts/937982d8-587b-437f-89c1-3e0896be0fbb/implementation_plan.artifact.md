# Plan de Diagnostic Profond : Serveur 404

Ce plan vise à identifier la cause exacte pour laquelle les routes `/api/profiles` ne sont pas activées sur votre serveur Cloud Run, malgré leur présence dans le code.

## User Review Required

> [!IMPORTANT]
> Nous allons temporairement exposer les erreurs de démarrage du serveur dans les réponses 404. Cela nous permettra de voir quel fichier (ex: `firebase.js` ou `profileController.js`) empêche l'activation de la création de profil.

## Proposed Changes

### [Server] Debug & Robustesse

#### [MODIFY] [firebase.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/config/firebase.js)
- Sécuriser l'export du `bucket` Storage. Si l'initialisation échoue, le serveur continuera de fonctionner pour les autres services (Auth, DB).

#### [MODIFY] [index.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/index.js)
- Créer un registre `mountErrors` pour stocker les raisons des échecs de chargement.
- Modifier le handler 404 pour inclure ces erreurs dans la réponse JSON.

## Verification Plan

### Manual Verification
1. Déployer sur `staging` et `main`.
2. Cliquer sur "J'adhère aux valeurs".
3. L'erreur 404 s'affichera toujours, mais elle contiendra un champ `mountErrors`.
4. Envoyez-moi le contenu de ce champ (ou une capture d'écran) pour que je puisse corriger la racine du problème.
