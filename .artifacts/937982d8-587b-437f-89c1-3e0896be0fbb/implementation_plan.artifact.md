# Enrichissement des informations de sécurité (La Sentinelle V4)

Ce plan vise à permettre à l'utilisateur de fournir des détails précis sur son rendez-vous (lieu, nom et contact de la personne rencontrée) afin que ces informations soient incluses dans les alertes de sécurité.

## Proposed Changes

### [Server] Module Sécurité

#### [MODIFY] [securityController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/securityController.js)
- Mettre à jour `scheduleCheckIn` et `triggerImmediateSOS` pour accepter et enregistrer l'objet `meetingDetails` :
    - `location` : Lieu du rendez-vous.
    - `personName` : Nom de la personne rencontrée.
    - `personContact` : Contact de la personne rencontrée.
- Stocker ces informations dans la collection `security_logs`.

### [Web Mobile] Interface Utilisateur

#### [MODIFY] [SentinelPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/SentinelPage.tsx)
- Ajouter des champs de saisie dans la section "Sécurité Active" :
    - Un champ pour le lieu du rendez-vous.
    - Un champ pour le nom de la personne rencontrée.
    - Un champ pour le contact de la personne rencontrée.
- S'assurer que ces données sont envoyées lors du déclenchement d'un minuteur ou d'un SOS immédiat.

## Verification Plan

### Manual Verification
1.  Ouvrir **Apps > La Sentinelle**.
2.  Saisir les informations du rendez-vous (ex: "Lounge Zone 4", "M. Koffi", "07000000").
3.  Lancer un minuteur de sécurité.
4.  Vérifier dans Firestore que le document `security_logs` contient bien l'objet `meeting_details` avec les bonnes valeurs.
5.  Tester le bouton SOS et vérifier que les détails sont également enregistrés.
