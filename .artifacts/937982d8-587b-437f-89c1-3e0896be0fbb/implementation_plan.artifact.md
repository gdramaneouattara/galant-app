# Remplissage Automatique du Guide (Google Maps Integration)

Ce plan vise à doter l'administrateur d'un outil permettant de peupler instantanément le guide Galant avec les établissements les plus prestigieux d'une ville, en utilisant les données de Google Places.

## Proposed Changes

### [Server] Service d'Intégration Google

#### [NEW] [googleMapsService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/googleMapsService.js)
- Implémentation de la recherche de lieux via `https://places.googleapis.com/v1/places:searchText`.
- Filtrage par catégories : `restaurant`, `night_club`, `bar`, `lodging`.
- Extraction des données : Nom, adresse, coordonnées GPS, note, et URL des photos.

#### [MODIFY] [adminController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/adminController.js)
- Ajouter une fonction `seedVenuesFromGoogle` qui reçoit une ville, appelle le service Google, et enregistre les résultats dans Firestore sous le statut `EDITORIAL` ou `APPROVED`.

### [Web Mobile] Outil d'Administration

#### [NEW] [AdminGuideSeeder.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminGuideSeeder.tsx)
- Une nouvelle page dans l'espace Admin.
- Un champ de saisie pour la ville (ex: "Abidjan").
- Un bouton "Peupler le Guide" avec barre de progression.

### [Shared] Modèle de Données

- Ajouter un flag `is_editorial: boolean` sur les établissements pour distinguer les lieux "Partenaires" (qui ont un compte admin) des lieux "Suggérés" (récupérés sur Google).

## User Review Required

> [!CAUTION]
> **Clé API Google Maps** : Vous devrez fournir une clé API valide avec "Places API" activé dans votre console Google Cloud. Sans cette clé, l'outil ne pourra pas fonctionner.

## Verification Plan

### Manual Verification
1.  Aller dans **Admin > Audit > Outils (Seeder)**.
2.  Taper "Douala" et lancer le processus.
3.  Vérifier dans l'onglet **Sorties (Guide)** que 20 nouvelles adresses sont apparues avec leurs photos et notes Google.
4.  Vérifier qu'elles sont bien marquées comme "Conseil Galant" ou "Recommandation".
