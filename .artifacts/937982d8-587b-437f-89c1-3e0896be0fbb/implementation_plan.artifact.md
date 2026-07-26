# Automatisation du chargement des profils (Discovery)

Ce plan vise à fluidifier l'expérience de découverte sur Web et Mobile en rechargeant automatiquement de nouvelles suggestions dès que la liste actuelle est épuisée, supprimant ainsi le besoin de cliquer manuellement sur un bouton "Recharger".

## Proposed Changes

### [Web] Écran Découverte

#### [MODIFY] [DiscoverPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverPage.tsx)
- Ajouter un `useEffect` qui surveille la longueur des suggestions restantes.
- Si le nombre de suggestions descend en dessous d'un seuil (ex: 2 profils restants) ou atteint 0, déclencher automatiquement l'appel à `fetchSuggestions`.
- S'assurer qu'un indicateur de chargement discret (spinner) apparaît si l'utilisateur arrive au bout de la liste avant que les nouveaux profils ne soient chargés.

### [Mobile] Écran d'accueil

#### [MODIFY] [HomeScreen.tsx](file:///C:/Users/UTILISATEUR/galant-app/src/screens/home/HomeScreen.tsx)
- Implémenter la même logique de surveillance : dès que la liste des `suggestions` s'approche de la fin, appeler `fetchSuggestions` en arrière-plan.
- Améliorer la transition pour que l'utilisateur ne voie jamais l'écran "Plus de profils" s'il reste des candidats compatibles en base de données.

## Verification Plan

### Manual Verification
1. Aller sur l'écran Découverte (Web et Mobile).
2. Swiper/Liker les profils un par un.
3. Vérifier que de nouveaux profils apparaissent automatiquement dès que la pile est presque vide.
4. Confirmer qu'il n'est plus nécessaire de cliquer sur le bouton "Recharger" tant qu'il y a des profils compatibles.
