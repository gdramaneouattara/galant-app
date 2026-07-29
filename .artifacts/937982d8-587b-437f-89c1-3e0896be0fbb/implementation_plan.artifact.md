# Évolution de "La Sentinelle" (V3) : Flexibilité et Contacts Multiples

Ce plan vise à enrichir le module de sécurité en permettant une personnalisation totale de la durée de veille et la sélection de plusieurs contacts de confiance directement depuis le répertoire du téléphone (via le Web Mobile).

## Proposed Changes

### [Server] Module Sécurité

#### [MODIFY] [securityController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/securityController.js)
- Mettre à jour `scheduleCheckIn` pour accepter un tableau de `contacts` au lieu d'un seul contact.
- Chaque contact contiendra un `name` et un `number`.

#### [MODIFY] [cronService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/cronService.js)
- Mettre à jour `processSecurityAlerts` pour boucler sur la liste des contacts lors du déclenchement de l'alerte.

### [Web Mobile] Interface Utilisateur

#### [MODIFY] [SentinelPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/SentinelPage.tsx)
- **Gestion de la Durée** :
    - Remplacer les boutons fixes par un sélecteur de durée (Heures / Minutes) permettant de dépasser les 60 minutes.
    - Ajouter un affichage clair de l'heure de fin estimée (ex: "Sécurité jusqu'à 22:45").
- **Gestion des Contacts (Max 2)** :
    - Ajouter une section "Contacts de confiance".
    - Implémenter l'utilisation de la **Contact Picker API** du navigateur pour sélectionner des numéros depuis le répertoire.
    - Prévoir un formulaire de saisie manuelle en cas d'incompatibilité du navigateur (fallback).
    - Limiter la sélection à 2 contacts maximum.

## User Review Required

> [!IMPORTANT]
> **Compatibilité du Répertoire** : L'accès direct au répertoire téléphonique depuis un site web (Web Mobile) est disponible sur la plupart des navigateurs Android récents (Chrome/Edge). Sur iPhone (Safari), cette fonctionnalité est encore expérimentale et peut nécessiter une activation manuelle dans les réglages. Un mode de saisie manuelle sera systématiquement proposé en alternative.

## Verification Plan

### Manual Verification
1.  Ouvrir **Apps > La Sentinelle**.
2.  Saisir une durée personnalisée (ex: 2h 15min).
3.  Cliquer sur "Ajouter un contact".
4.  Vérifier que le répertoire du téléphone s'ouvre (si supporté) ou qu'un formulaire apparaît.
5.  Ajouter 2 contacts et vérifier que le bouton d'ajout se grise.
6.  Lancer le timer et vérifier en base de données que les 2 contacts sont bien enregistrés.
