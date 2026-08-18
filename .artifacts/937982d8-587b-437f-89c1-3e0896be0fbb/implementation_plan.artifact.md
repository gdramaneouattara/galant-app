# Correction du Conflit Visuel : Barre de Recherche Statique

Ce plan vise à supprimer le comportement "collant" (sticky) de la barre de recherche dans le Guide, afin d'éviter qu'elle ne recouvre les photos et les titres des établissements lors du défilement.

## Proposed Changes

### [Web Mobile] Interface du Guide

#### [MODIFY] [GuidePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/GuidePage.tsx)
- **Désactivation du mode Sticky** :
    - Retirer la classe `sticky top-24 z-40` du conteneur de recherche et des catégories.
    - Supprimer la classe `bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-lg` qui n'a plus d'utilité si la barre ne flotte plus au-dessus des images.
- **Ajustement du Design** :
    - Simplifier le conteneur pour qu'il soit un bloc standard intégré au flux de la page.
    - S'assurer que les marges (`my-8` ou `space-y-8`) créent une séparation nette entre le Hero Header et la Grille.

## User Review Required

> [!NOTE]
> **Expérience Utilisateur** : En rendant la barre statique, l'utilisateur a une vue totalement dégagée sur les superbes photos des établissements. S'il veut refaire une recherche, il lui suffit de remonter légèrement en haut de la page, ce qui est le comportement standard des catalogues de luxe.

## Verification Plan

### Manual Verification
1.  Ouvrir le **Guide Galant**.
2.  Faire défiler la page vers le bas.
3.  Vérifier que la barre de recherche monte et disparaît normalement.
4.  Vérifier que les photos des établissements (ex: Saakan) apparaissent maintenant en plein écran sans aucune superposition.
5.  Confirmer que le bouton de bascule Guide/Agenda en haut de page (ExperiencesPage) reste, lui, bien accessible si nécessaire.
