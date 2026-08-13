# Centralisation de la Monétisation (Nouveau "Store" Prestige)

Ce plan vise à créer un espace unique nommé "Store" regroupant tous les abonnements et achats ponctuels, accessible directement depuis la page Profil (Moi).

## Proposed Changes

### [Web Mobile] Création du Hub de Vente

#### [NEW] [StorePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/StorePage.tsx)
- Création d'une page unifiée regroupant :
    - **Abonnements** : Standard et Privilège.
    - **Solde Roses** : Packs de 1, 5, 10 roses.
    - **Boosts de Visibilité** : 1, 3, 7 jours.
    - **Déblocages** : Accès Galerie (Grid) et Boîte de Likes.
- Design aligné sur la charte "Signature Prestige" (Playfair Display, Montserrat).
- Intégration de la logique de paiement Paystack via le hook `useSubscription`.

### [Web Mobile] Intégration dans le Profil

#### [MODIFY] [ProfilePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ProfilePage.tsx)
- Ajout d'une section **"STORE GALANT"** très proéminente en haut de la liste d'actions.
- Cette section servira d'entrée principale vers tous les privilèges payants.
- **Note** : Conformément aux instructions, aucun élément existant ne sera supprimé ou modifié.

#### [MODIFY] [App.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/App.tsx)
- Enregistrement de la nouvelle route `/store`.

## User Review Required

> [!IMPORTANT]
> **Consolidation** : Bien que les liens individuels (Premium, Boost, Roses) restent présents dans le menu du profil pour respecter la consigne de non-suppression, le "Store" deviendra le point d'entrée recommandé pour une expérience plus fluide.

## Verification Plan

### Manual Verification
1.  Ouvrir la page **Profil (Moi)**.
2.  Vérifier la présence du nouveau bouton/section **"STORE"**.
3.  Cliquer sur le Store : vérifier que tous les produits (Abonnements, Roses, Boosts, Déblocages) sont bien listés avec leurs prix.
4.  Tester l'ouverture d'un tunnel de paiement pour une Rose.
5.  Vérifier que le design respecte les polices et espacements "Prestige".
