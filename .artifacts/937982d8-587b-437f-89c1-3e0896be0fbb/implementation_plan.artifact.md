# Activation du Scrapping Réel pour le Marché Galant (Phase 2)

Ce plan vise à passer du mode simulation au mode réel pour le comparateur de prix, en commençant par l'intégration de **Jumia Côte d'Ivoire**.

## Proposed Changes

### [Server] Module Marché (Scrapping)

#### [MODIFY] [package.json](file:///C:/Users/UTILISATEUR/galant-app/server/package.json)
- Ajouter la dépendance `cheerio` pour l'analyse du code HTML des sites distants.

#### [MODIFY] [scrapperService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/scrapperService.js)
- Implémenter la fonction `fetchJumiaPrices(query)` :
    - Utiliser `axios` avec des en-têtes (Headers) réalistes pour simuler un navigateur.
    - Utiliser `cheerio` pour extraire les noms, prix, images et liens des produits sur `jumia.ci`.
    - Nettoyer les données (ex: transformer "150 000 FCFA" en nombre `150000`).
- Mettre à jour `scrapeProductIfNeeded` pour :
    - Tenter d'abord le scrapping réel sur Jumia.
    - En cas d'échec (blocage Cloudflare ou erreur réseau), basculer automatiquement sur la simulation intelligente (Fallback) pour ne pas laisser l'utilisateur sans réponse.

## User Review Required

> [!WARNING]
> **Anti-Bot & Stabilité** : Les sites comme Jumia utilisent des protections (Cloudflare). Il est possible que le scrapping soit parfois bloqué selon l'adresse IP du serveur Cloud Run. La stratégie de "Fallback" (simulation) que j'ai incluse garantit que l'application reste fonctionnelle même en cas de blocage.

## Verification Plan

### Manual Verification
1.  Ouvrir **Le Marché**.
2.  Rechercher un produit spécifique (ex: "Samsung A54").
3.  Vérifier que les résultats affichés correspondent aux produits actuellement en vente sur Jumia CI.
4.  Vérifier que les liens "Voir sur la boutique" redirigent bien vers les fiches produits réelles.
