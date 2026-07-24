# Walkthrough : Ajout de l'option Paramètres (Web)

J'ai rétabli la parité entre la version mobile et la version web en ajoutant le menu "Paramètres" dans l'onglet Moi.

## Changements effectués

### [Web Components]
- **[SettingsModal.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/SettingsModal.tsx)** : Nouveau composant permettant de changer la langue de l'application (Français/Anglais) avec une interface élégante et des indicateurs visuels de sélection.

### [Web Pages]
- **[ProfilePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ProfilePage.tsx)** :
    - Ajout du bouton "Paramètres" dans la liste des actions du profil.
    - Intégration de l'icône `Settings` et gestion de l'état d'ouverture de la modal.

## Déploiement

Les modifications ont été appliquées localement. Je vais maintenant procéder à la synchronisation des branches `staging` et `main` pour rendre ces changements effectifs en ligne.

> [!TIP]
> Une fois déployé, vous trouverez l'option juste au-dessus du menu "Aide" dans votre profil. Le changement de langue est instantané et persistant.
