# Optimisation visuelle finale du profil (Web)

Ce plan vise à corriger les derniers conflits visuels sur la page profil identifiés dans la capture d'écran de l'utilisateur, afin d'assurer un standing "Prestige".

## Proposed Changes

### [Web] Pages

#### [MODIFY] [ProfilePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ProfilePage.tsx)
- **Bouton Photo** : Déplacer l'icône caméra en **haut à droite** (`top-6 right-6`).
- **Position du Nom** : Abaisser le bloc Nom/Âge pour qu'il soit juste au-dessus des statistiques et ne masque plus le visage.
- **Style des Statistiques** :
    - Réduire la largeur minimale (`min-w-[75px]`).
    - Utiliser un fond blanc avec opacité (`bg-white/90`) pour une meilleure intégration visuelle sur la photo.
    - S'assurer que les titres (Galanterie, Likes, Roses) sont parfaitement lisibles sur mobile.

## Verification Plan

### Manual Verification
1.  Ouvrir le profil sur navigateur mobile.
2.  Vérifier que l'icône caméra est en haut et ne gêne plus la lecture des chiffres.
3.  Confirmer que le nom est bien placé et que les statistiques sont élégamment alignées.
