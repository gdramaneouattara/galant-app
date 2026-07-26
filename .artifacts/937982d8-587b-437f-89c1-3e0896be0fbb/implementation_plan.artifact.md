# Optimisation du chargement automatique (Discovery)

Ce plan vise à stabiliser la recharge automatique des profils en empêchant les boucles infinies de chargement lorsque la base de données est réellement vide.

## Proposed Changes

### [Web] Écran Découverte

#### [MODIFY] [DiscoverPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverPage.tsx)
- Ajouter un état `hasMore` (booléen) initialisé à `true`.
- Dans `loadSuggestions`, si le serveur renvoie une liste vide, passer `hasMore` à `false`.
- Mettre à jour le `useEffect` de recharge automatique pour qu'il ne se déclenche que si `hasMore` est vrai.
- Réinitialiser `hasMore` à `true` lorsque l'utilisateur modifie ses filtres.

### [Mobile] Écran d'Accueil

#### [MODIFY] [HomeScreen.tsx](file:///C:/Users/UTILISATEUR/galant-app/src/screens/home/HomeScreen.tsx)
- Ajouter un état `hasMore` similaire.
- Bloquer la recharge automatique si aucun profil n'a été trouvé lors de la tentative précédente.
- S'assurer que le message "Plus de profils pour le moment" reste visible sans clignotement de chargement incessant.

## Verification Plan

### Manual Verification
1. Aller sur l'onglet Découverte avec des filtres très restrictifs (pour vider la pile).
2. Vérifier que le système tente de charger une fois, puis s'arrête proprement s'il n'y a rien.
3. Vérifier que le message "Plus de profils..." s'affiche de manière stable.
4. Modifier les filtres pour élargir la recherche et vérifier que le chargement repart normalement.
