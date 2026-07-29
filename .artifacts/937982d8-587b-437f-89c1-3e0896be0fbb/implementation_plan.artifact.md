# Implémentation du Filtre "Pilule Flottante" (La Sentinelle)

Ce plan se concentre exclusivement sur la refonte du bouton de filtrage de la page Découverte pour adopter un design de prestige, minimaliste et immersif.

## Proposed Changes

### [Web Mobile] Interface Utilisateur

#### [MODIFY] [DiscoverPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverPage.tsx)
- **Suppression du bouton existant** : Retrait du bouton de filtre massif dans le header.
- **Création de la Pilule Flottante** :
    - Ajout d'un composant `<button>` positionné en `fixed` au sommet de l'écran.
    - **Design Glassmorphism** : Fond semi-transparent (`bg-white/10` ou `bg-slate-900/40`) avec un flou d'arrière-plan (`backdrop-blur-xl`).
    - **Indicateur Dynamique** : Si des filtres sont actifs, application d'une bordure dorée (`border-amber-500/50`) et d'une légère lueur (`shadow-[0_0_15px_rgba(245,158,11,0.2)]`).
    - **Typographie** : Affichage discret du texte "Filtres" uniquement si l'espace le permet, sinon icône `SlidersHorizontal` seule et centrée.

## Verification Plan

### Manual Verification
1.  Ouvrir la page **Découverte**.
2.  Vérifier que le filtre flotte bien en haut de l'écran.
3.  Vérifier que le contenu (photos, texte) défile derrière la pilule de manière visible grâce au flou.
4.  Activer un filtre et vérifier que la pilule change d'aspect (bordure dorée).
5.  S'assurer que le clic ouvre toujours la modal de filtrage correctement.
