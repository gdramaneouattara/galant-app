# Réorganisation des onglets de navigation

Ce plan vise à déplacer l'onglet "Messages" pour qu'il soit placé immédiatement après l'onglet "Découvrir" sur toutes les plateformes (Web et Mobile).

## User Review Required

> [!NOTE]
> Ce changement affectera l'ordre visuel des menus de navigation en bas de l'écran (mobile/web mobile) et dans l'en-tête (web desktop).

## Proposed Changes

### [Web] Navigation

#### [MODIFY] [App.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/App.tsx)
- Dans le composant `MobileNav`, déplacer le lien `/matches` (Messages) en deuxième position, juste après `/` (Découvrir).
- Dans le composant `Header`, déplacer le lien `/matches` (Messages) en deuxième position, juste après `/` (Découvrir).

### [Mobile] Navigation

#### [MODIFY] [MainNavigator.tsx](file:///C:/Users/UTILISATEUR/galant-app/src/navigation/MainNavigator.tsx)
- Dans le `UserTabNavigator`, réorganiser les écrans pour placer `MessagesTab` en deuxième position, immédiatement après `DiscoverTab`.

## Verification Plan

### Manual Verification
1. Lancer la version Web et vérifier que "Messages" est bien le deuxième élément dans le menu du haut et dans la barre de navigation mobile.
2. Lancer l'application Mobile et vérifier que l'icône de message est la deuxième dans la barre d'onglets en bas.
