# Guidage Immersif : Le Vernissage et les Indices de Lumière

Ce plan vise à orienter les utilisateurs dans l'application sans utiliser d'IA intrusive, en privilégiant une narration visuelle (Vernissage) et des micro-interactions subtiles (Indices de Lumière).

## Proposed Changes

### [Web] Composants de Guidage

#### [NEW] [WelcomeVernissage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/WelcomeVernissage.tsx)
- Un overlay plein écran affiché à la première connexion après l'inscription.
- **Storytelling** : 3 écrans immersifs avec fonds floutés et typographie Playfair Display.
    - Écran 1 : "Bienvenue dans l'Élite" (L'univers Galant).
    - Écran 2 : "La Galerie & Le Marché" (Découverte et Efficacité).
    - Écran 3 : "La Sentinelle" (Votre ange gardien).
- Un bouton final "Commencer l'expérience" qui met à jour le profil de l'utilisateur.

#### [NEW] [FeatureHighlight.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/FeatureHighlight.tsx)
- Un composant "Wrapper" qui entoure un bouton ou une carte.
- **Effet Visuel** : Une lueur (halo) rose ou dorée qui pulse très doucement autour de l'élément.
- **Persistance** : Utilise le `localStorage` pour disparaître une fois que l'utilisateur a cliqué sur l'élément pour la première fois.

### [Web] Intégration dans les Pages

#### [MODIFY] [DiscoverPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverPage.tsx)
- Entourer le bouton de bascule vers la **Grille** avec un `FeatureHighlight`.

#### [MODIFY] [AppsPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/AppsPage.tsx)
- Appliquer un `FeatureHighlight` sur les nouvelles cartes **"Le Marché"** et **"La Sentinelle"**.

#### [MODIFY] [App.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/App.tsx)
- Ajouter une logique pour afficher le `WelcomeVernissage` si le profil contient le champ `has_seen_vernissage: false`.

#### [MODIFY] [OnboardingPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/OnboardingPage.tsx)
- Initialiser `has_seen_vernissage: false` lors de la création du profil (Step 6).

## Verification Plan

### Manual Verification
1.  Créer un nouveau compte : vérifier que le **Vernissage** s'affiche juste après l'activation des services.
2.  Parcourir le Vernissage et cliquer sur "Commencer" : vérifier que l'on arrive sur la page Découverte.
3.  Sur la page Découverte : vérifier que le bouton Grille "pulse" doucement. Cliquer dessus et vérifier que la lueur disparaît.
4.  Aller dans l'onglet **Apps** : vérifier que le Marché et la Sentinelle brillent. Cliquer sur l'un d'eux et vérifier la disparition du halo.
