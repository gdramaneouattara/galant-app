# Amélioration de la gestion des contacts (La Sentinelle)

Ce plan vise à permettre aux utilisateurs de supprimer et de modifier leurs contacts de confiance enregistrés dans le module La Sentinelle.

## Proposed Changes

### [Web Mobile] Interface Utilisateur

#### [MODIFY] [SentinelPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/SentinelPage.tsx)
- **Édition de contact** :
    - Ajouter une icône d'édition (`Edit2`) à côté de l'icône de suppression pour chaque contact de la liste.
    - Cliquer sur l'icône d'édition ouvrira le formulaire de saisie manuelle pré-rempli avec les informations du contact sélectionné.
- **Logique de mise à jour** :
    - Adapter la fonction `addManualContact` pour qu'elle puisse soit ajouter un nouveau contact, soit mettre à jour un contact existant (selon un index d'édition).
- **Suppression** :
    - Conserver la fonction `removeContact` existante.
- **Persistance** :
    - Rappeler à l'utilisateur de cliquer sur "Sauvegarder" après toute modification (suppression ou édition) pour que les changements soient définitifs dans son profil.

## Verification Plan

### Manual Verification
1.  Ouvrir **Apps > La Sentinelle**.
2.  Ajouter un contact de test.
3.  Cliquer sur l'icône d'édition : vérifier que le nom et le numéro s'affichent dans le formulaire.
4.  Modifier le numéro et valider : vérifier que la liste se met à jour.
5.  Supprimer un contact : vérifier qu'il disparaît de la liste.
6.  Cliquer sur **Sauvegarder** et rafraîchir la page : vérifier que les modifications sont bien conservées.
