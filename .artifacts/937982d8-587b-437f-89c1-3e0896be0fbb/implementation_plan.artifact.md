# Correction finale du compteur de Likes et Roses

Ce plan vise à sécuriser l'incrémentation des compteurs et à garantir leur affichage en temps réel, en corrigeant les instabilités potentielles du serveur et du client.

## Problèmes identifiés
1.  **Fiabilité de l'incrément** : L'utilisation de `admin.firestore.FieldValue.increment` peut être instable selon la version exacte du SDK. Nous allons utiliser l'import direct du module `firestore`.
2.  **État initial** : Certains profils anciens n'ont pas les champs `likes_count` ou `roses_count`, ce qui peut ralentir la première mise à jour.
3.  **Crashes Frontend** : Les erreurs de type `Heart is not defined` empêchaient l'application de fonctionner correctement, bloquant potentiellement l'envoi des swipes.

## Proposed Changes

### [Server] Logique de Compteurs

#### [MODIFY] [matchmakingController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/matchmakingController.js)
- Importer `FieldValue` directement depuis `firebase-admin/firestore`.
- Utiliser `FieldValue.increment(1)` pour plus de robustesse.
- Ajouter des logs plus verbeux pour confirmer chaque incrémentation réussie en base.

#### [MODIFY] [maintenanceService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/maintenanceService.js)
- S'assurer que tous les profils ont au moins `0` dans ces champs lors de la réconciliation.

### [Web] Interface

#### [MODIFY] [InteractionPurchaseModal.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/InteractionPurchaseModal.tsx)
- S'assurer que toutes les icônes (`Heart`, `Star`, `MessageCircle`) sont correctement importées pour éviter tout crash.

## Verification Plan

### Automated Tests
- Relancer `npm run test:quality` pour valider l'absence de régressions.

### Manual Verification
1.  Lancer la réconciliation automatique (en redémarrant le serveur).
2.  Effectuer un Like depuis un compte de test.
3.  Vérifier les logs serveur pour la mention `[COUNTER] Increment success`.
4.  Vérifier sur le profil destinataire que le chiffre a bien augmenté sans rafraîchir (grâce à l'écouteur temps réel déjà en place).
