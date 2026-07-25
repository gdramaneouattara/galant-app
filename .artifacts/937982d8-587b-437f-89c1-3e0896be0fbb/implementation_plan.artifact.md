# Parité Totale Mobile/Web de l'onglet Moi

Ce plan vise à implémenter sur la version Web toutes les fonctionnalités manquantes identifiées par rapport à la version mobile, garantissant une expérience utilisateur cohérente et complète.

## User Review Required

> [!IMPORTANT]
> Les fonctions RGPD (Export et Suppression) impliquent des actions irréversibles ou sensibles. Les appels API seront protégés par le token d'authentification Firebase comme sur mobile.

## Proposed Changes

### [Web Pages & Navigation]

#### [NEW] [BoostPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/BoostPage.tsx)
- Création de la page de gestion des Boosts.
- Affichage des plans (1 jour, 3 jours, 7 jours).
- Intégration du paiement via Paystack (Mobile Money).
- Gestion de l'activation du boost gratuit (si éligible).

#### [MODIFY] [App.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/App.tsx)
- Ajouter la route `/boost` pour la nouvelle page.

#### [MODIFY] [ProfilePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ProfilePage.tsx)
- Ajouter les boutons manquants dans le menu de droite :
    - **Vérification d'identité** (si non vérifié).
    - **Boîte de Roses** (redirection vers `/likes`).
    - **Boosts de visibilité** (redirection vers `/boost`).
    - **Export des données** (téléchargement JSON).
    - **Suppression du compte** (avec confirmation).

### [Web Features Logic]

#### [MODIFY] [VerifyPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/VerifyPage.tsx)
- Améliorer la récupération du statut KYC via `/api/kyc/me` pour afficher l'état réel (En attente, Rejeté, etc.).

## Verification Plan

### Manual Verification
1. **Boosts** : Accéder à `/boost`, vérifier que les prix s'affichent et que le bouton Paystack redirige correctement.
2. **Likes** : Cliquer sur "Boîte de Roses" dans le profil et vérifier la liste des likes reçus.
3. **KYC** : Cliquer sur "Vérifier mon identité" et s'assurer que le formulaire fonctionne.
4. **RGPD** :
    - Cliquer sur "Télécharger mes données" et vérifier qu'un fichier JSON est généré.
    - Cliquer sur "Supprimer mon compte", confirmer, et vérifier la déconnexion et suppression.
