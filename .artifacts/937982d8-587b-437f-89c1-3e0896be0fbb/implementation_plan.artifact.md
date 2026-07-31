# Planification de l'Appel Fantôme (La Sentinelle)

Ce plan vise à permettre aux utilisateurs de programmer le déclenchement de l'Appel Fantôme après un délai défini, pour une simulation de sortie de secours plus naturelle.

## Proposed Changes

### [Web Mobile] Interface de Sécurité

#### [MODIFY] [SentinelPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/SentinelPage.tsx)
- **Sélecteur de Temps** :
    - Ajouter une section "Quand sonner ?" dans la carte Appel Fantôme.
    - Proposer des options : `0 (Immédiat)`, `1 min`, `2 min`, `5 min`.
- **Logique de Temporisation** :
    - Créer un état `scheduledCallTime` pour stocker le moment du futur appel.
    - Implémenter un compte à rebours visuel discret pendant la phase d'attente.
    - Déclencher l'overlay d'appel et la sonnerie automatiquement à l'échéance.
- **Vibration de Prévention** :
    - Utiliser l'API `navigator.vibrate` pour émettre une brève vibration 5 secondes avant le début de la sonnerie, afin d'avertir l'utilisateur discrètement.

## User Review Required

> [!TIP]
> **Scénario d'usage** : Vous sentez que le rendez-vous devient inconfortable. Vous prétextez d'aller aux toilettes ou de regarder l'heure, vous réglez l'appel sur "2 minutes". Vous rangez votre téléphone. 2 minutes plus tard, "Bureau" vous appelle alors que vous êtes à table, vous offrant le prétexte parfait pour partir.

## Verification Plan

### Manual Verification
1.  Ouvrir **La Sentinelle**.
2.  Régler l'appel fantôme sur "1 minute".
3.  Cliquer sur "Lancer la programmation".
4.  Vérifier qu'un compte à rebours s'affiche et que l'interface reste réactive.
5.  Attendre 1 minute : vérifier que la sonnerie se déclenche et que l'interface Galant disparaît (Immersion totale).
6.  Tester l'annulation d'un appel programmé.
