# Implémentation de "La Sentinelle" (Sécurité & Discrétion) - Isolation Totale

Ce plan détaille l'ajout du module de sécurité personnel au sein de l'onglet **Apps** pour la version Web Mobile. Fidèle à notre architecture modulaire, ce service sera totalement indépendant de la partie "Rencontres" et du "Marché Galant".

## Architecture d'Isolation

1.  **Backend** : Création de fichiers dédiés `/server/src/controllers/securityController.js` et `/server/src/routes/securityRoutes.js`. Aucune interaction avec les contrôleurs existants.
2.  **Base de données** : Utilisation d'une collection Firestore isolée `security_logs` pour les timers de sécurité.
3.  **Frontend** : Création d'une page autonome `/web/src/pages/SentinelPage.tsx`. Aucun import croisé avec les pages de matchmaking ou de marché.

## Proposed Changes

### [Server] Module Sécurité (Backend)

#### [NEW] [securityRoutes.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/routes/securityRoutes.js)
- Points d'accès :
    - `POST /api/security/schedule` : Enregistre un timer de sécurité.
    - `POST /api/security/confirm` : Annule le timer en cours.

#### [NEW] [securityController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/securityController.js)
- Logique de gestion des alertes.
- Préparation de l'envoi WhatsApp/SMS (Mode "Log" pour la Phase 1 jusqu'à configuration des clés API).

#### [MODIFY] [index.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/index.js)
- Enregistrement de la nouvelle branche de routes `/api/security`.

### [Web] Interface "La Sentinelle" (Frontend)

#### [NEW] [SentinelPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/SentinelPage.tsx)
- **Tableau de bord** : Interface de réglage du timer (15 min, 30 min, 1h).
- **Appel Fantôme** :
    - Bouton d'activation immédiate ou programmée (ex: "Appelez-moi dans 2 minutes").
    - **Simulation réaliste** : Overlay plein écran avec photo d'un contact ("Bureau", "Maman", "Chauffeur"), sonnerie et boutons Décrocher/Raccrocher.
    - **Mode Conversation** : Si décroché, l'app affiche un écran d'appel actif avec un chronomètre.

#### [MODIFY] [AppsPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/AppsPage.tsx)
- Ajout de l'icône **🛡️ La Sentinelle** dans le hub.

#### [MODIFY] [App.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/App.tsx)
- Déclaration de la route `/sentinel`.

## Verification Plan

### Manual Verification
1.  Accéder à **Apps > La Sentinelle**.
2.  Déclencher un **Appel Fantôme** immédiat : vérifier le réalisme de l'écran et de la sonnerie.
3.  Programmer un **Check-in** de 1 min : vérifier que l'alerte de confirmation s'affiche au bout du délai.
4.  Vérifier que les autres fonctionnalités (Swipes, Marché) ne sont pas ralenties ou modifiées.
