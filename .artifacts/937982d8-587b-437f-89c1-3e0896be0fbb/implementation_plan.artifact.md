# Amélioration de la réactivité du Marché Galant

Ce plan vise à corriger le problème de résultats vides lors de la première recherche d'un produit et à rendre le moteur de comparaison plus intelligent et réactif.

## Problème identifié
Actuellement, lors de la toute première recherche d'un terme (ex: "télévision 42 pouces"), le serveur cherche en base de données, ne trouve rien, renvoie une liste vide à l'utilisateur, et **ensuite** seulement lance le scrapping en arrière-plan. L'utilisateur doit donc chercher deux fois pour voir des résultats.

## Proposed Changes

### [Server] Module Marché

#### [MODIFY] [marketController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/marketController.js)
- Modifier `searchProducts` pour **attendre** (`await`) le résultat du scrapping si la base de données est vide pour cette recherche.
- Améliorer la recherche par mots-clés : au lieu de chercher la phrase exacte, nous allons chercher si au moins un des mots importants est présent.
- Retourner les résultats fraîchement scrapés immédiatement à l'utilisateur.

#### [MODIFY] [scrapperService.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/services/scrapperService.js)
- Ajouter une vérification pour éviter de scrapper plusieurs fois le même terme en un temps court (cache de 24h).
- Améliorer la génération des mots-clés pour inclure des variations (minuscules, sans accents si possible).

## Verification Plan

### Manual Verification
1.  Ouvrir **Le Marché**.
2.  Saisir un nouveau terme jamais recherché auparavant (ex: "Machine à café").
3.  Vérifier que les résultats s'affichent **dès la première validation** (le temps de chargement sera un peu plus long, environ 2-3 secondes, ce qui est normal pour une recherche en direct).
4.  Confirmer que la recherche par mots partiels fonctionne aussi.
