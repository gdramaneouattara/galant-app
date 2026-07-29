# Raccordement WhatsApp pour La Sentinelle (Phase 5)

Ce plan vise à rendre les alertes de sécurité réelles en connectant le serveur Galant à l'API **Meta Cloud (WhatsApp Business)**. Les proches recevront désormais un message direct sur leur WhatsApp en cas d'urgence.

## Proposed Changes

### [Server] Module de Communication

#### [NEW] [whatsappService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/whatsappService.js)
- Création d'un service isolé pour gérer l'envoi de messages via Meta.
- Fonction `sendSecurityAlert(contacts, userDetails, meetingDetails)` :
    - Boucle sur la liste des contacts de confiance.
    - Utilise `axios` pour envoyer une requête `POST` vers l'API Meta Graph.
    - Utilise un "Template Message" (requis par Meta pour les messages proactifs).
    - Formatage du message incluant le lieu du rendez-vous et l'identité de la personne rencontrée.

#### [MODIFY] [cronService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/cronService.js)
- Importer `whatsappService`.
- Dans `processSecurityAlerts`, appeler `sendSecurityAlert` dès qu'un incident est détecté (`INCIDENT_TRIGGERED`).

#### [MODIFY] [securityController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/securityController.js)
- Dans `triggerImmediateSOS`, appeler instantanément `sendSecurityAlert`.

#### [MODIFY] [.env.example](file:///C:/Users/UTILISATEUR/galant-app/server/.env.example)
- Ajouter les variables nécessaires :
    - `WHATSAPP_PHONE_NUMBER_ID`
    - `WHATSAPP_ACCESS_TOKEN`
    - `WHATSAPP_TEMPLATE_NAME`

## User Review Required

> [!CAUTION]
> **Validation Meta** : Pour envoyer des alertes WhatsApp proactives, vous devez créer un compte sur [Meta for Developers](https://developers.facebook.com/) et faire valider un "Message Template".
> - Exemple de template recommandé : *"Alerte de sécurité Galant : Votre proche {{1}} a besoin d'assistance. Dernier lieu connu : {{2}}. Personne rencontrée : {{3}}."*
> - Le code sera prêt, mais l'envoi réel ne fonctionnera qu'après cette étape de configuration.

## Verification Plan

### Automated Tests
- Relancer `npm run test:quality` pour valider l'absence de régressions.

### Manual Verification
1.  Activer le mode "Log" dans le service WhatsApp (en attendant les clés).
2.  Déclencher un SOS.
3.  Vérifier dans les logs du serveur que le message WhatsApp est généré avec les bonnes informations (nom, lieu, contact rencontre).
