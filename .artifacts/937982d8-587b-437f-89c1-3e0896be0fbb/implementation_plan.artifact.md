# Revue de "La Sentinelle" (V2) - Sécurité Active & Personnalisation

Ce plan vise à rendre le module **La Sentinelle** totalement opérationnel en ajoutant une surveillance en arrière-plan des minuteurs et en permettant une personnalisation poussée de l'Appel Fantôme.

## Proposed Changes

### [Server] Surveillance Active (Backend)

#### [MODIFY] [cronService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/cronService.js)
- Implémenter `processSecurityAlerts` :
    - Scanne la collection `security_logs` toutes les minutes.
    - Identifie les logs dont le statut est `PENDING` et dont l'heure `expires_at` est dépassée.
    - Marque ces logs comme `INCIDENT_TRIGGERED`.
    - Prépare l'envoi de la notification d'alerte.
- Mettre à jour `initCronJobs` pour inclure cette vérification chaque minute.

#### [MODIFY] [securityController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/securityController.js)
- Ajouter une fonction `triggerImmediateSOS` :
    - Enregistre immédiatement un log avec le statut `SOS_IMMEDIAT`.
    - Prépare l'envoi d'une alerte urgente sans délai.

### [Web Mobile] Personnalisation & Contrôle (Frontend)

#### [MODIFY] [SentinelPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/SentinelPage.tsx)
- **Appel Fantôme** :
    - Ajouter un champ de texte pour le **Nom de l'appelant** (ex: "Maman", "Chauffeur").
    - Ajouter une sélection de photo (avatar) pour l'appelant.
- **Tableau de bord de Sécurité** :
    - Affichage du temps restant pour le minuteur actif.
    - Bouton **"SOS IMMÉDIAT"** (rouge, bien visible) pour alerter les proches instantanément.
- **Ressources** : Améliorer le pré-chargement de la sonnerie pour éviter tout délai.

## Verification Plan

### Manual Verification
1.  Accéder à **Apps > La Sentinelle**.
2.  Changer le nom de l'appelant en "Maître Ouattara" et déclencher l'appel fantôme.
3.  Lancer un minuteur de 1 minute. Attendre l'expiration sans cliquer sur "Je vais bien".
4.  Vérifier dans Firestore que le statut du log est passé en `INCIDENT_TRIGGERED`.
5.  Cliquer sur le bouton **SOS IMMÉDIAT** et vérifier la création du log correspondant.
