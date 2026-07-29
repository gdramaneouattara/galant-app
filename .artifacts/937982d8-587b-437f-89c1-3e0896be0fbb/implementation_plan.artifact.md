# La Sentinelle V5 : Paramètres d'Urgence et Géolocalisation

Ce plan vise à rendre l'alerte SOS de La Sentinelle extrêmement précise en incluant les coordonnées GPS de l'utilisateur, le lieu du rendez-vous, ainsi que l'identité de la personne rencontrée, le tout envoyé à deux contacts de confiance pré-enregistrés.

## Proposed Changes

### [Server] Module Sécurité & Profil

#### [MODIFY] [profileController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/profileController.js)
- Ajouter la possibilité de stocker de façon permanente les `emergency_contacts` (max 2) dans le document de l'utilisateur.

#### [MODIFY] [securityController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/securityController.js)
- Mettre à jour `triggerImmediateSOS` et `scheduleCheckIn` pour accepter les coordonnées GPS (`latitude`, `longitude`).
- Formater le message WhatsApp pour inclure un lien **Google Maps** vers la position de l'utilisateur.

### [Web Mobile] Interface Utilisateur

#### [MODIFY] [SentinelPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/SentinelPage.tsx)
- **Pré-configuration des contacts** :
    - Ajouter une section "Paramètres de Sécurité" permettant d'enregistrer ses 2 contacts favoris de manière permanente.
- **Bouton SOS Intelligent** :
    - Au clic sur le bouton SOS :
        1. Demander la permission GPS au navigateur.
        2. Récupérer les coordonnées exactes.
        3. Envoyer le SOS avec les détails du rendez-vous (lieu, nom rencontre) et le lien Maps.
- **Saisie des détails** : Conserver les champs de lieu et de rencontre ajoutés en V4.

## Verification Plan

### Manual Verification
1.  Ouvrir **Apps > La Sentinelle**.
2.  Enregistrer deux contacts de test dans les paramètres permanents.
3.  Saisir un lieu (ex: "Lounge Riviera") et un nom de rencontre.
4.  Cliquer sur le bouton rouge **SOS**.
5.  Autoriser la localisation sur le téléphone.
6.  Vérifier dans les logs serveur que le message WhatsApp généré contient :
    - Votre nom.
    - Le lieu et le nom de la rencontre.
    - Un lien cliquable `https://www.google.com/maps?q=lat,lon`.
