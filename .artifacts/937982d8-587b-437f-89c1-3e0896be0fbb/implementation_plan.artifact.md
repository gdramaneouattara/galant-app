# Optimisation visuelle de la page Profil (Web)

Ce plan vise à corriger les conflits visuels identifiés sur la page profil mobile/web afin de renforcer l'élégance et la lisibilité de l'interface Galant.

## Proposed Changes

### [Web] Pages

#### [MODIFY] [ProfilePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ProfilePage.tsx)
- **Bouton Photo** : Déplacer le bouton d'importation de photo du bas-droite vers le **haut-droite** (`top-6 right-6`) de l'image de couverture. Cela évitera le chevauchement avec les boîtes de statistiques.
- **Position du Nom et de l'Âge** :
    - Réduire la taille de la police pour le nom de `text-4xl` à `text-2xl` sur mobile (tout en gardant `md:text-4xl` pour le desktop).
    - Ajuster le décalage vertical (`bottom-12` au lieu de `-bottom-8`) pour que le nom ne masque plus le centre du visage.
- **Boîtes de Statistiques** :
    - Réduire le rembourrage interne de `p-4` à `p-3`.
    - Ajuster la largeur minimale de `min-w-[80px]` à `min-w-[75px]` pour un aspect plus fin et mieux espacé sur les petits écrans.
- **Titre de la Biographie** : Augmenter la taille du titre "MA BIOGRAPHIE" de `text-xs` à `text-sm` pour une meilleure hiérarchie visuelle.

## Verification Plan

### Manual Verification
1.  Ouvrir la page Profil sur navigateur mobile et desktop.
2.  Vérifier que le bouton photo est en haut à droite.
3.  Vérifier que le nom est bien positionné et ne cache plus le visage de l'utilisateur.
4.  Vérifier que les 3 boîtes de statistiques (Galanterie, Likes, Roses) sont bien alignées sans se chevaucher.
5.  Confirmer que le titre de la biographie est plus lisible.
