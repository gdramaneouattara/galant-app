# Ajout de l'option Paramètres dans l'onglet Moi (Web)

L'option "Paramètres" est présente sur la version mobile mais manquante sur la version Web. Ce plan vise à rétablir la parité entre les deux plateformes en ajoutant le menu de réglages sur le Web.

## User Review Required

> [!NOTE]
> La version Web ne supporte pas encore le mode sombre dynamique (contrairement au mobile). Pour l'instant, les paramètres sur le Web se concentreront sur la gestion de la langue et serviront de point d'entrée pour les futures options de compte.

## Proposed Changes

### [Web Components]

#### [NEW] [SettingsModal.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/SettingsModal.tsx)
- Créer un composant modal stylisé pour le Web.
- Permettre le basculement entre Français et Anglais.
- Utiliser les fonctions `language` et `setLanguage` du contexte `AuthContext`.

### [Web Pages]

#### [MODIFY] [ProfilePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ProfilePage.tsx)
- Ajouter l'icône `Settings` et le bouton "Paramètres" dans la colonne de droite.
- Gérer l'état d'ouverture de la nouvelle modal.

## Verification Plan

### Manual Verification
1. Aller dans l'onglet "Moi" sur la version Web.
2. Vérifier la présence du bouton "Paramètres" au-dessus de "Aide".
3. Cliquer sur le bouton et vérifier que la modal s'ouvre.
4. Changer la langue et vérifier que l'interface se met à jour instantanément.
