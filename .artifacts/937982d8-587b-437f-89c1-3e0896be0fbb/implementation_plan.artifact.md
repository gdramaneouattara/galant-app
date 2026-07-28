# Transparence des sources et Optimisation du Scrapping

Ce plan vise à rendre le comparateur de prix plus transparent pour l'utilisateur final en affichant explicitement la source des données (réelle vs estimée) et en améliorant le taux de succès du robot de scrapping.

## Proposed Changes

### [Server] Module Marché (Transparence)

#### [MODIFY] [scrapperService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/scrapperService.js)
- Ajouter un champ `is_real: boolean` dans l'objet produit.
- Mettre `is_real: true` pour les résultats provenant de Jumia.
- Mettre `is_real: false` pour les simulations de fallback.
- Améliorer les en-têtes (User-Agent tournant) pour réduire les blocages Cloudflare.

#### [MODIFY] [marketController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/marketController.js)
- S'assurer que le champ `is_real` est bien transmis au frontend.

### [Web] Interface "Le Marché" (UI)

#### [MODIFY] [MarketPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/MarketPage.tsx)
- Ajouter un badge sur les cartes produits :
    - Un badge vert **"VÉRIFIÉ JUMIA"** avec une icône de bouclier.
    - Un badge ambre **"ESTIMATION GALANT"** pour les simulations.
- Ajouter une info-bulle expliquant que les estimations sont fournies lorsque les sites marchands sont temporairement inaccessibles.

## Verification Plan

### Manual Verification
1.  Lancer une recherche.
2.  Vérifier la présence du badge sur chaque carte.
3.  Vérifier que les produits avec des images réelles ont le badge "Vérifié".
4.  Confirmer que l'utilisateur comprend l'origine de l'information.
