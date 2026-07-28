# Stabilisation du Marché : Rafraîchissement Forcé et Lutte anti-doublons

Ce plan vise à donner le contrôle à l'utilisateur sur la fraîcheur des données et à empêcher la pollution de la base par des estimations répétitives en cas de blocage du robot.

## Proposed Changes

### [Server] Module Marché (Logique de mise à jour)

#### [MODIFY] [scrapperService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/scrapperService.js)
- **Politique de mise à jour** :
    - Si le scrapping réel échoue, le système ne crée une estimation **que si la base est totalement vide** pour ce mot-clé.
    - Si des données (réelles ou estimées) existent déjà, le système renvoie l'existant sans rien ajouter de nouveau.
- **Optimisation Jumia** : Test d'une URL alternative (`/search?q=`) au lieu de `/catalog/?q=`.

### [Web] Interface "Le Marché" (Contrôle Utilisateur)

#### [MODIFY] [MarketPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/MarketPage.tsx)
- Ajouter un bouton **"Actualiser les prix"** à côté du titre des résultats.
- Ce bouton appellera l'API `clear-cache` puis relancera la recherche.
- Ajouter un indicateur visuel lorsque le robot tente un "Scan profond" sur le web.

## Verification Plan

### Manual Verification
1.  Faire une recherche (ex: "TV").
2.  Si des estimations apparaissent, cliquer sur le nouveau bouton **"Actualiser"**.
3.  Vérifier que les résultats sont supprimés de la base et que le robot tente une nouvelle infiltration sur Jumia.
4.  Vérifier que le nombre total d'estimations n'augmente plus indéfiniment.
