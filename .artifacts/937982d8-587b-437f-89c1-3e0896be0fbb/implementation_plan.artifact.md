# Ajout de la gestion du tarif "Déblocage Likes (2h)" dans l'interface Admin

Ce plan vise à permettre aux administrateurs de modifier dynamiquement le prix du déblocage temporaire de la boîte de likes depuis le tableau de bord de gestion des tarifs.

## Proposed Changes

### [Web] Administration

#### [MODIFY] [AdminPricing.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminPricing.tsx)
- Ajouter l'entrée `LIKES_INBOX_2H` dans la liste des interactions individuelles.
- Utiliser l'icône `Heart` pour ce champ.
- S'assurer que la valeur est correctement synchronisée avec l'état local et envoyée au serveur lors de l'enregistrement.

## Verification Plan

### Manual Verification
1. Se connecter avec un compte Administrateur.
2. Aller dans **Admin > Tarifs**.
3. Vérifier que le champ "Déblocage Likes (2h)" est présent.
4. Modifier la valeur (ex: passer de 1000 à 1500).
5. Cliquer sur **Enregistrer**.
6. Rafraîchir la page et vérifier que la nouvelle valeur est persistée.
7. Vérifier sur un compte utilisateur que le nouveau prix est bien appliqué dans la boîte de likes.
