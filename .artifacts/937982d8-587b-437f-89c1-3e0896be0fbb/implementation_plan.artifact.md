# Plan de stabilisation finale du serveur

Le serveur Cloud Run semble toujours exécuter une version obsolète du code ou rencontre une erreur fatale au chargement de Firebase. Ce plan vise à rendre l'initialisation "blindée" et à garantir que le déploiement est effectif.

## User Review Required

> [!IMPORTANT]
> - Le déploiement sur Cloud Run via GitHub Actions peut prendre jusqu'à 5-7 minutes.
> - L'erreur actuelle (`reading 'length'`) confirme que le correctif précédent n'est pas encore actif ou a été partiellement appliqué.

## Proposed Changes

### [Server] Initialisation robuste

#### [MODIFY] [firebase.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/config/firebase.js)
- Rendre la détection des applications Firebase existantes encore plus sécurisée.
- Ajouter des logs d'étape pour suivre l'initialisation dans Cloud Run.

#### [MODIFY] [index.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/index.js)
- Déplacer toutes les variables de diagnostic au sommet du fichier.
- S'assurer que le handler 404 ne dépend d'aucune variable potentiellement non initialisée.

## Verification Plan

### Manual Verification
1. Pousser les modifications.
2. **Attendre explicitement 7 minutes** pour être sûr que le build est terminé.
3. Vérifier `/api/ping`. Si vous voyez `timestamp`, le nouveau code est en place.
4. Tester l'onboarding.
