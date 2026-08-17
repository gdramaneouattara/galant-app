# Simplification du Filtrage Découverte

Ce plan vise à épurer les critères de recherche de l'écran Découverte en supprimant les filtres de score et de certification, tout en ajoutant un filtre par ville.

## Proposed Changes

### [Web Mobile] Interface de Filtrage

#### [MODIFY] [FilterModal.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/FilterModal.tsx)
- **Suppression** :
    - Retirer le bouton "Profils certifiés uniquement".
    - Retirer la section "Score minimum" (boutons 4+, 4.5+, etc.).
- **Ajout** :
    - Insérer un champ de saisie texte "Ville" juste après la section de l'âge.
- **Traductions** :
    - Ajouter `city: 'Ville'` (FR) et `city: 'City'` (EN) dans l'objet `copy`.

#### [MODIFY] [DiscoverPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverPage.tsx)
- Mettre à jour l'état initial des filtres pour inclure `city: ''`.
- S'assurer que le bouton de reset remet bien la ville à zéro.

## Verification Plan

### Manual Verification
1.  Ouvrir les filtres sur la page **Découverte**.
2.  Vérifier que les options de score et de certification ont disparu.
3.  Vérifier la présence du champ "Ville" après l'âge.
4.  Taper une ville (ex: "Douala") et appliquer : vérifier que les résultats sont mis à jour.
5.  Tester le bouton "Réinitialiser" : vérifier que le champ ville se vide.
