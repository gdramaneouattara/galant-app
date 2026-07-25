# Amélioration de la visibilité et correction du rang de matchmaking

Ce plan vise à corriger les problèmes de visibilité entre profils de même sexe (pour les objectifs non-strict) et à stabiliser le calcul du rang dans la ville.

## Problèmes identifiés
1.  **Filtrage par distance trop strict** : Si un utilisateur n'a pas de coordonnées GPS (latitude/longitude), la distance est `null`. Le système filtre actuellement ces profils si un filtre de distance est actif, même s'ils sont dans la même ville.
2.  **Calcul du rang erroné (1/1)** : La requête Firestore pour compter les membres dans une ville est sensible à la casse (ex: "Abidjan" vs "abidjan"). Si deux utilisateurs écrivent leur ville différemment, ils ne se "voient" pas dans le classement.
3.  **Objectifs "Amitié" et "On verra bien"** : Bien que la logique serveur soit correcte, le filtrage par distance empêche probablement la visibilité mutuelle.

## Proposed Changes

### [Server] Logique de Matchmaking

#### [MODIFY] [matchmakingController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/matchmakingController.js)
- **Suggestions** : Dans `getSuggestions`, si la distance est indisponible (`null`), autoriser l'affichage du profil si la ville correspond (`cityFilter`), même si une distance maximum est définie.
- **Visibilité (Rang)** : Dans `getVisibilityInsight`, récupérer tous les profils complétés de la base (puisque nous filtrons déjà en mémoire pour éviter les index) et effectuer le calcul du rang avec une comparaison de ville insensible à la casse.
- **Score** : Mettre à jour `calculateMatchScore` pour que le bonus de ville soit insensible à la casse.

#### [MODIFY] [matchmakingService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/matchmakingService.js)
- Rendre le bonus `city === me.city` insensible à la casse et robuste aux espaces.

## Verification Plan

### Manual Verification
1. Créer deux profils Homme avec l'objectif "Amitié" à "Abidjan".
2. S'assurer qu'ils se voient dans l'écran Découverte même sans GPS activé.
3. Vérifier que le rang affiche bien "1/2" ou "2/2" au lieu de "1/1".
4. Tester avec des variations de casse (Abidjan vs abidjan).
