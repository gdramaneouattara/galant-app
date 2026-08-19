# Résolution de l'Erreur "Illegal constructor" (Filtres Découverte)

Ce plan vise à corriger l'erreur technique `TypeError: Illegal constructor` qui survient lors de l'interaction avec les filtres, en sécurisant la manipulation des dates et les imports de composants.

## Proposed Changes

### [Web Mobile] Sécurisation du Code

#### [MODIFY] [DiscoverPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverPage.tsx)
- **Refactoring des Dates** :
    - Extraire la logique de vérification du pass filtres dans une fonction utilitaire.
    - Utiliser `Date.parse()` ou vérifier le type avant de passer par `new Date()`.
    - Gérer le cas où la date est un objet `Timestamp` de Firebase.
- **Défense visuelle** : Simplifier le rendu conditionnel du cadenas 🔒 pour éviter les calculs lourds dans le JSX.

#### [MODIFY] [InteractionPurchaseModal.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/InteractionPurchaseModal.tsx)
- **Alias d'icônes** : Renommer l'import de `SlidersHorizontal` en `FiltersIcon` pour éviter tout conflit potentiel avec des noms globaux du navigateur.

## User Review Required

> [!NOTE]
> **Origine technique** : L'erreur "Illegal constructor" est souvent déclenchée par une tentative de création d'objet (`new`) sur une variable qui n'est pas un constructeur valide (ex: une fonction native détournée ou un objet corrompu). Ce nettoyage rendra l'application plus robuste face aux différences entre navigateurs.

## Verification Plan

### Manual Verification
1.  Ouvrir la page **Découverte**.
2.  Cliquer sur l'icône des filtres (avec ou sans pass actif).
3.  Vérifier que l'application ne crash plus et que le modal (achat ou filtres) s'ouvre normalement.
4.  Vérifier que le statut de l'abonnement est toujours correctement pris en compte.
