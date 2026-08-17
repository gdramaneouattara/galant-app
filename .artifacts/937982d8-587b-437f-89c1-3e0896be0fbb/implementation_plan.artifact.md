# Épuration de la Carte de Profil (Découverte)

Ce plan vise à simplifier radicalement les informations affichées sur les cartes de profil dans la section Découverte, en ne conservant que l'identité essentielle du membre.

## Proposed Changes

### [Web Mobile] Interface Découverte

#### [MODIFY] [DiscoverPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverPage.tsx)
- Supprimer le bloc `div` contenant le **Score de Charme** et les **Affinités/Status**.
- S'assurer que le nom, l'âge et la ville restent bien positionnés en bas de la photo.

#### [MODIFY] [DiscoverGridPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverGridPage.tsx)
- Supprimer l'affichage du **Score de Charme** (ou Galanterie) sur les miniatures de la grille pour rester cohérent avec la vue Swipe.

## Verification Plan

### Manual Verification
1.  Ouvrir la page **Découverte** (Mode Swipe).
2.  Vérifier que les deux encadrés gris en bas ("Score de charme" et "Status") ont disparu.
3.  Vérifier que le nom, l'âge et la ville sont toujours lisibles sur le dégradé sombre.
4.  Passer en **Mode Grille** (La Galerie).
5.  Vérifier que les scores n'apparaissent plus sur les miniatures.
