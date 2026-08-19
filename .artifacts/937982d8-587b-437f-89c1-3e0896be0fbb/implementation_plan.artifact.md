# Verrouillage Temporaire des Services du Guide

Ce plan vise à suspendre temporairement les fonctionnalités "Proposer", "Yango" et "Accès Conciergerie" dans le Guide Galant, en informant les utilisateurs que ces services seront disponibles prochainement.

## Proposed Changes

### [Web Mobile] Interface du Guide

#### [MODIFY] [GuidePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/GuidePage.tsx)
- **Interception des Actions** :
    - Modifier le bouton **"Proposer"** pour afficher une alerte au lieu d'ouvrir le modal de suggestion.
    - Modifier le bouton **"Yango"** pour afficher une alerte au lieu d'ouvrir l'application de transport.
    - Modifier le bouton **"Accès Conciergerie"** pour afficher une alerte au lieu de lancer une discussion.
- **Message d'information** :
    - Titre : *"Service en préparation"*
    - Corps : *"Cette fonctionnalité sera disponible très prochainement pour enrichir votre expérience Galant."*
- **Design (Optionnel)** : Ajouter une légère opacité (`opacity-70`) pour suggérer l'indisponibilité tout en gardant les boutons visibles.

#### [MODIFY] [VenueDetailPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/VenueDetailPage.tsx)
- **Discuter avec l'hôte** : Modifier la fonction `startVenueChat` pour afficher la même alerte d'indisponibilité.

## User Review Required

> [!NOTE]
> **Expérience Utilisateur** : Cette approche permet de montrer la richesse future de l'application tout en gérant les attentes des membres durant la phase de lancement.

## Verification Plan

### Manual Verification
1.  Ouvrir le **Guide Galant**.
2.  Cliquer sur **Proposer** sur une carte : vérifier l'affichage du message "Service en préparation".
3.  Cliquer sur **Yango** : vérifier l'affichage du message.
4.  Cliquer sur **Accès Conciergerie** : vérifier l'affichage du message.
5.  Aller sur la fiche détaillée d'un lieu et cliquer sur **Discuter avec l'hôte** : vérifier l'affichage du message.
