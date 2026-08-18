# Monétisation Dynamique des Filtres (Pass Temporaire)

Ce plan vise à rendre l'accès aux filtres payant avec une durée configurable par l'administrateur, tout en informant clairement l'utilisateur du rapport prix/durée au moment de l'achat.

## Proposed Changes

### [Server] Configuration

#### [MODIFY] [constants.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/config/constants.js)
- Définir `DISCOVER_FILTERS_UNLOCK: 500` et `DISCOVER_FILTERS_DAYS: 3` par défaut.

### [Web Mobile] Interface Utilisateur Dynamique

#### [MODIFY] [InteractionPurchaseModal.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/InteractionPurchaseModal.tsx)
- **Nettoyage texte** : Retirer la mention temporelle du paragraphe descriptif.
- **Badge de Durée** : Ajouter l'affichage de la durée (ex: "Valable 3 jours") dans la zone de prix pour une clarté maximale.
- **Logique** : Prévoir la réception de la durée en prop ou via une valeur par défaut synchronisée.

#### [MODIFY] [StorePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/StorePage.tsx)
- Mettre à jour la carte "Pass Filtres" pour afficher la durée de manière proéminente.

### [Web Mobile] Espace Admin

#### [MODIFY] [AdminPricing.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminPricing.tsx)
- Ajouter les inputs pour `DISCOVER_FILTERS_UNLOCK` et `DISCOVER_FILTERS_DAYS`.

## User Review Required

> [!TIP]
> **Information Client** : En plaçant la durée juste à côté du prix (ex: "500 F | 3 Jours"), l'information est perçue comme une caractéristique technique du produit, ce qui est plus rassurant et clair qu'une phrase dans un long texte.

## Verification Plan

### Manual Verification
1.  **Admin** : Changer la durée à 7 jours dans les réglages.
2.  **User** : Cliquer sur les filtres et vérifier que le modal affiche bien "Valable 7 jours" au niveau du bouton ou du prix.
3.  **Achat** : Vérifier que le serveur calcule bien la date d'expiration en fonction de ce nouveau réglage.
