# Implémentation du Swipe Tactile sur le Web

Ce plan vise à ajouter le support des gestes de "Swipe" (glissement) sur la version Web de Galant, afin de retrouver la fluidité et l'intuitivité de l'application mobile.

## User Review Required

> [!IMPORTANT]
> - L'implémentation utilisera la bibliothèque **framer-motion**, qui est la référence pour les animations fluides et les gestes dans React.
> - Le geste de glissement sera supporté sur ordinateur (souris) et mobile (tactile).

## Proposed Changes

### [Web Core] Dépendances

#### [ACTION] Installation de framer-motion
- Exécuter `npm install framer-motion` dans le dossier `web`.

### [Web Components] Écran Découverte

#### [MODIFY] [DiscoverPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverPage.tsx)
- Importer `motion` et `useMotionValue`, `useTransform` de `framer-motion`.
- Remplacer le conteneur de la carte par un `motion.div` draggable.
- Ajouter des contraintes de glissement horizontales.
- Implémenter l'apparition dynamique de badges "LIKE" (vert) et "NOPE" (rouge) sur la carte pendant le glissement.
- Relier la fin du glissement (`onDragEnd`) aux fonctions `onSwipe('LEFT')` et `onSwipe('RIGHT')` si la distance est suffisante.
- Ajouter un effet de rotation élégant pendant que l'utilisateur fait glisser la carte.

## Verification Plan

### Manual Verification
1. Aller sur l'écran Découverte sur le Web.
2. Cliquer et faire glisser la carte vers la droite : vérifier que le badge "LIKE" apparaît et que la carte s'envole si on lâche loin.
3. Faire glisser vers la gauche : vérifier le badge "NOPE" et l'action de refus.
4. Vérifier que les boutons classiques en dessous fonctionnent toujours en complément.
5. Tester sur un navigateur mobile pour valider la fluidité tactile.
