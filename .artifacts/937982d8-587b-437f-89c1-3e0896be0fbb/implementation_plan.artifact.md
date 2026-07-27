# Implémentation du Comparateur de Prix "Le Marché Galant"

Ce plan détaille l'ajout d'un module de comparaison de prix autonome au sein de l'onglet **Apps**. Ce module permettra aux utilisateurs de rechercher des produits et de comparer les prix issus de différentes sources web, renforçant l'aspect utilitaire et quotidien de l'application.

## Proposed Changes

### [Server] Module Marché (Backend)

#### [NEW] [marketRoutes.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/routes/marketRoutes.js)
- Définir les points d'accès API :
    - `GET /api/market/search?q=...` : Rechercher des produits.
    - `GET /api/market/trends` : Voir les produits populaires.

#### [NEW] [marketController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/marketController.js)
- Gérer la logique de recherche en consultant la collection Firestore `market_products`.
- Si un produit n'est pas en base ou est obsolète, déclencher une demande de mise à jour au service de scrapper.

#### [NEW] [scrapperService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/scrapperService.js)
- Moteur d'extraction de données.
- Pour la Phase 1, implémentation d'une logique basée sur `axios` pour extraire les prix de sites e-commerce majeurs (ex: Jumia, Amazon, ou sites locaux).

#### [MODIFY] [index.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/index.js)
- Monter les routes `/api/market`.

### [Web] Interface "Le Marché" (Frontend)

#### [NEW] [MarketPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/MarketPage.tsx)
- Création d'une interface de recherche épurée.
- Affichage des résultats sous forme de cartes élégantes avec historique de prix.
- Bouton "Suivre le prix" pour recevoir des notifications (via Firestore `price_alerts`).

#### [MODIFY] [AppsPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/AppsPage.tsx)
- Ajouter l'application "Le Marché" avec l'icône `ShoppingCart`.

#### [MODIFY] [App.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/App.tsx)
- Déclarer la route `/market`.

## Firestore Schema
- `market_products` : `{ id, name, category, image_url, current_price, currency, source_url, last_scraped_at }`
- `market_prices_history` : `{ product_id, price, date }`

## Verification Plan

### Manual Verification
1.  Ouvrir l'onglet **Apps**.
2.  Cliquer sur **Le Marché**.
3.  Effectuer une recherche (ex: "iPhone 15").
4.  Vérifier que les résultats s'affichent avec les prix comparés.
5.  Vérifier qu'aucune autre partie de l'application (Matchmaking, Chat) n'est impactée.
