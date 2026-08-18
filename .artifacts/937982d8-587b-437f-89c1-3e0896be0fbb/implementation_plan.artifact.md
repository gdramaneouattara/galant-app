# Correction du Débordement du Menu Admin

Ce plan vise à rendre la barre latérale (sidebar) de l'espace Administrateur défilante, afin de permettre l'accès à tous les outils (Seeder, Agenda, etc.) même sur les écrans à faible hauteur.

## Proposed Changes

### [Web Mobile] Mise à jour du Layout Admin

#### [MODIFY] [AdminLayout.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminLayout.tsx)
- **Activation du défilement** : Ajouter la classe `overflow-y-auto` à la balise `<nav>` de la barre latérale.
- **Optimisation visuelle** :
    - Ajouter la classe `no-scrollbar` pour masquer la barre de défilement technique et préserver le design épuré.
    - S'assurer que le pied de page de la sidebar (profil admin) reste bien fixé en bas grâce à la structure `flex flex-col` existante.
- **Ajustement des espacements** : Réduire légèrement les paddings verticaux si nécessaire pour optimiser l'espace.

## Verification Plan

### Manual Verification
1.  Accéder à l'espace **Admin**.
2.  Réduire la hauteur de la fenêtre du navigateur jusqu'à ce que le menu déborde.
3.  Vérifier qu'il est maintenant possible de faire défiler le menu pour atteindre les options **Seeder** et **Agenda**.
4.  Vérifier que le logo "GALANT ADMIN" en haut et le bloc profil en bas restent bien visibles (ne défilent pas).
