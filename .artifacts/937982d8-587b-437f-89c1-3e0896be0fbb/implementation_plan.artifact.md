# Correction de l'envoi de message après un match (Erreur 403)

Ce plan vise à corriger le bug qui empêche les hommes non-Premium d'envoyer le premier message dans une conversation, même après un match mutuel.

## Problème identifié
Dans la fonction `sendMessage`, le système considère tout premier message (`!lastMsg`) comme un "engagement" nécessitant un abonnement ou un achat. Il oublie que si le match est "naturel" (les deux personnes se sont likées), le premier message doit être autorisé gratuitement.

## Proposed Changes

### [Server] Logique des messages

#### [MODIFY] [messageController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/messageController.js)
- Dans `sendMessage`, affiner la détection de l'engagement pour les hommes non-Premium.
- Avant de bloquer un premier message (`isEngagement`), vérifier si un like réciproque existe dans la collection `likes`.
- Si le match est mutuel (`reciprocalLike.exists`), autoriser l'envoi du message sans vérifier l'achat ou l'abonnement.
- Conserver la restriction pour les messages consécutifs (relances) afin de prévenir le spam des comptes gratuits.

## Verification Plan

### Manual Verification
1.  Utiliser un compte Homme (non-Premium) et un compte Femme.
2.  Liker l'Homme avec le compte Femme.
3.  Liker la Femme avec le compte Homme -> Match créé.
4.  Essayer d'envoyer "Bonjour" depuis le compte Homme.
5.  Vérifier que le message est envoyé avec succès (plus d'erreur 403).
6.  Essayer d'envoyer un deuxième message à la suite sans réponse -> Vérifier que là, le système demande Premium (protection anti-spam).
