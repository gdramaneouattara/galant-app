# Rétablissement du Sélecteur Guide/Agenda

Ce plan vise à restaurer la possibilité de basculer entre le Guide et l'Agenda via un bouton de sélection unique, tout en gardant le Guide comme vue prioritaire par défaut.

## Proposed Changes

### [Web Mobile] Navigation & Expérience

#### [MODIFY] [ExperiencesPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ExperiencesPage.tsx)
- **Priorité Guide** : Changer l'état initial `activeTab` de `AGENDA` vers **`GUIDE`**.
- **Impact** : L'utilisateur voit les établissements dès le chargement, mais conserve le bouton pour switcher vers les événements.

#### [MODIFY] [App.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/App.tsx)
- **Routage Unifié** :
    - Dans la barre du bas (`MobileNav`), pointer le lien "Guide" vers `/experiences` (au lieu de `/guide`).
    - Dans le menu du haut (`Header`), faire de même pour le lien "Guide".
- **Impact** : Toutes les entrées "Guide" mènent désormais vers le composant qui possède le sélecteur Guide/Agenda.

## User Review Required

> [!NOTE]
> **Expérience Utilisateur** : Cette approche est la plus ergonomique. Elle donne l'impression d'un seul grand univers "Sorties" où l'on choisit son mode de vue (Lieux ou Événements) via le bouton en haut, tout en respectant votre consigne de mettre le Guide en avant.

## Verification Plan

### Manual Verification
1.  Cliquer sur l'onglet **Guide** dans la barre du bas.
2.  Vérifier que la liste des établissements (Guide) s'affiche immédiatement.
3.  Vérifier que le sélecteur (bouton bascule) est présent en haut de l'écran.
4.  Cliquer sur **Agenda** dans ce sélecteur : vérifier que la liste des événements se charge.
5.  Vérifier que l'Agenda n'a pas disparu des menus principaux.
