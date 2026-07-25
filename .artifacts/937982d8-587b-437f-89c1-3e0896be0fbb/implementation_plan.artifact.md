# Intégration des Boîtes de Likes et Roses dans l'onglet Messages

Ce plan vise à rendre les "Likes Reçus" et la "Boîte de Roses" accessibles directement depuis l'onglet Messages (MatchesPage), offrant ainsi un point d'accès rapide aux nouvelles attentions reçues, comme sur l'application mobile.

## User Review Required

> [!NOTE]
> Nous allons ajouter une section de "Notifications d'Intérêt" en haut de la page des messages. Cette section affichera le nombre de nouveaux likes et de nouvelles roses pour inciter l'utilisateur à les consulter.

## Proposed Changes

### [Web Pages]

#### [MODIFY] [MatchesPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/MatchesPage.tsx)
- Ajouter un état pour stocker les compteurs de likes et de roses.
- Implémenter un `useEffect` pour récupérer ces compteurs via les API `/api/likes/received` et `/api/super-likes/received`.
- Ajouter une nouvelle section de composants visuels (deux cartes stylisées) juste au-dessus de la liste des "Nouveaux Matchs".
    - **Carte Likes** : Couleur Rose/Rouge, icône Cœur, affiche le nombre de likes en attente.
    - **Carte Roses** : Couleur Or/Ambre, icône Rose, affiche le nombre de Super Likes en attente.
- Harmoniser le design avec le mode sombre.

## Verification Plan

### Manual Verification
1. Aller sur l'onglet **Messages** sur le Web.
2. Vérifier que les deux nouvelles cartes ("Likes Reçus" et "Boîte de Roses") apparaissent en haut.
3. Vérifier que les compteurs s'affichent correctement (si l'utilisateur a des likes/roses).
4. Cliquer sur chaque carte et vérifier la redirection vers les pages correspondantes.
5. Vérifier le rendu en mode sombre.
