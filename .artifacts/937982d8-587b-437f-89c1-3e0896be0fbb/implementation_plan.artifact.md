# Optimisation finale de l'en-tête de profil (Web)

Ce plan vise à corriger les derniers conflits visuels sur la page profil pour un rendu "Ultra Prestige", en repositionnant le nom et en rendant les statistiques plus élégantes.

## Proposed Changes

### [Web] Pages

#### [MODIFY] [ProfilePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ProfilePage.tsx)
- **Position du Nom** : Descendre le bloc nom/âge encore plus bas (`bottom-6` au lieu de `bottom-10`) et réduire la taille de police sur mobile à `text-xl` pour éviter tout chevauchement avec le visage.
- **Style des Statistiques** :
    - Rendre les boîtes de statistiques **translucides** (`bg-white/20 backdrop-blur-xl`) pour un effet de transparence luxueux qui laisse deviner la photo derrière.
    - Utiliser une bordure très fine et blanche (`border-white/20`).
    - Changer la couleur du texte des étiquettes (Galanterie, Likes, Roses) en blanc pur pour une meilleure lisibilité sur fond sombre.
- **Ajustement du Bouton Photo** : Réduire légèrement sa taille et l'opacité au repos pour qu'il soit moins intrusif.

## Verification Plan

### Manual Verification
1.  Ouvrir le profil sur navigateur mobile.
2.  Vérifier que le nom "OUATTARA Dramane" est bien en bas de l'image et ne touche plus le menton/visage.
3.  Vérifier l'effet de transparence "Glassmorphism" sur les 3 boîtes de statistiques.
4.  Confirmer que l'icône appareil photo ne gêne plus la lecture des chiffres.
