# Plan d'Urgence : Activation du Scrapping Réel et Résolution des Blocages

Ce plan vise à forcer l'extraction de données réelles depuis Jumia CI en utilisant une stratégie de navigation humaine plus avancée et en nettoyant les anciennes données simulées.

## Problème identifié
Le système de protection de Jumia (DataDome/Cloudflare) détecte notre robot comme une machine et bloque l'accès. Notre serveur bascule alors trop vite sur les "Estimations Galant" pour ne pas faire attendre l'utilisateur.

## Proposed Changes

### [Server] Module Marché (Scrapper v3)

#### [MODIFY] [scrapperService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/scrapperService.js)
- **Stratégie de Session** : Le robot va désormais d'abord "visiter" la page d'accueil de Jumia pour récupérer un jeton de session (Cookie) avant de lancer la recherche.
- **Headers de Confiance** : Ajout de paramètres techniques (`Sec-Fetch`, `Referer`) pour simuler un clic provenant du site lui-même.
- **Délai de Courtoisie** : Ajout d'un léger délai aléatoire entre la connexion et la recherche pour paraître plus humain.

#### [NEW] [maintenanceRoutes.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/routes/maintenanceRoutes.js)
- Création d'un outil pour **vider le cache** du marché pour un mot-clé précis. Cela nous permettra de supprimer vos "Estimations" actuelles pour "télévision 32 pouces" et forcer le robot à retenter le coup avec sa nouvelle identité.

### [Web] Interface

#### [MODIFY] [MarketPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/MarketPage.tsx)
- Améliorer le message d'attente pour expliquer que le robot "négocie" l'accès aux prix réels.

## Verification Plan

### Manual Verification
1.  Je vais lancer un script de nettoyage pour supprimer les anciennes estimations de votre base.
2.  Vous ferez une nouvelle recherche.
3.  On vérifiera les logs pour voir si Jumia a accepté notre nouvelle identité d'iPhone.
