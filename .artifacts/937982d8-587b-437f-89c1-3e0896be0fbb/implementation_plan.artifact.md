# Implémentation du Quota de Consultation (Galerie)

Ce plan vise à instaurer une limite de consultation sur la Galerie (Vue Grille) pour les membres non-premium, garantissant une rentabilité maximale et protégeant l'exclusivité du service.

## Proposed Changes

### [Server] Configuration & Logique

#### [MODIFY] [constants.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/config/constants.js)
- Ajouter `DEFAULT_GRID_QUOTA: 100` dans les constantes.

#### [MODIFY] [subscriptionService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/subscriptionService.js)
- Lors de l'achat `DISCOVER_GRID_UNLOCK`, initialiser le champ `grid_consultations_remaining` dans le profil avec la valeur configurée par l'admin.

#### [MODIFY] [matchmakingController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/matchmakingController.js)
- Modifier `getSuggestions` pour la vue grille :
    - Décompter du quota `grid_consultations_remaining` le nombre de profils effectivement renvoyés.
    - Bloquer la réponse si le quota est épuisé (retourner une erreur spécifique).

### [Web Mobile] Interface Utilisateur

#### [MODIFY] [AdminPricing.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminPricing.tsx)
- Ajouter un champ pour configurer le quota (ex: "Nombre de profils par achat").

#### [MODIFY] [DiscoverGridPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverGridPage.tsx)
- Afficher un bandeau discret en haut indiquant le quota restant : *"Exploration : [X] profils restants"*.
- Gérer l'état de fin de quota avec une redirection vers une proposition de rachat ou de passage au Premium.

## Verification Plan

### Manual Verification
1.  **Admin** : Fixer le quota à 5 profils (pour le test) et le prix à 1000 F.
2.  **Membre Classique** : Acheter l'accès Galerie.
3.  Ouvrir la Galerie : Vérifier que 5 profils s'affichent et que le compteur indique "5 restants".
4.  Rafraîchir ou faire une recherche : Vérifier que le quota diminue.
5.  Une fois à 0 : Vérifier que la Galerie se verrouille et propose de repasser au mode Swipe ou de racheter un quota.
