# Activation des Notifications Push sur le Web

Ce plan vise à doter la version Web de Galant de la capacité d'envoyer des notifications push en temps réel, garantissant que les membres ne manquent aucune interaction importante (Match, Message, Alerte de Sécurité).

## État des Lieux
- **Mobile** : Les notifications sont déjà opérationnelles via FCM et Expo.
- **Web** : Actuellement, la version web est "silencieuse". Si l'utilisateur ferme son navigateur, il ne reçoit plus aucune information.

## Proposed Changes

### [Web] Infrastructure de Messagerie

#### [MODIFY] [firebase.ts](file:///C:/Users/UTILISATEUR/galant-app/web/src/firebase.ts)
- Importer `getMessaging` et `getToken` depuis Firebase.
- Exporter l'instance `messaging` pour l'utiliser dans l'application.

#### [NEW] [firebase-messaging-sw.js](file:///C:/Users/UTILISATEUR/galant-app/web/public/firebase-messaging-sw.js)
- Création du Service Worker obligatoire pour Firebase Cloud Messaging.
- Ce fichier permet au navigateur de recevoir et d'afficher des notifications même lorsque le site Galant n'est pas ouvert.

### [Web] Enregistrement des Tokens

#### [MODIFY] [AuthContext.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/context/AuthContext.tsx)
- Implémenter la fonction `registerWebPushToken(userId)` :
    - Demander la permission à l'utilisateur via le navigateur.
    - Récupérer le token FCM unique du navigateur.
    - Enregistrer ce token dans la collection Firestore `push_tokens` (la même que le mobile) pour que le serveur sache où envoyer les alertes.
- Appeler cette fonction automatiquement après chaque connexion réussie.

### [Server] Compatibilité Web

#### [MODIFY] [notificationService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/notificationService.js)
- S'assurer que le serveur traite les tokens Web comme des tokens FCM standards.
- (Optionnel) Ajouter une icône spécifique "Web" dans les métadonnées de notification.

## User Review Required

> [!IMPORTANT]
> **Consentement de l'utilisateur** : Le navigateur affichera une fenêtre demandant "Voulez-vous autoriser galant.app à vous envoyer des notifications ?". L'utilisateur doit accepter pour que cela fonctionne. C'est un gage de sérieux et de prestige.

## Verification Plan

### Manual Verification
1.  Se connecter sur la version Web.
2.  Accepter la demande de notification du navigateur.
3.  Vérifier dans la console Firebase (ou Firestore) qu'un nouveau token avec la plateforme `web` a été créé.
4.  Depuis un autre compte, envoyer un message.
5.  Vérifier que la notification apparaît sur le bureau ou l'écran de verrouillage du téléphone (même si l'onglet Galant est fermé).
