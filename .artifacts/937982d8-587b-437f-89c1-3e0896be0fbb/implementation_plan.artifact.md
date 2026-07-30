# Refonte Typographique "Signature Prestige"

Ce plan vise à donner à Galant une identité visuelle digne d'une marque de luxe en intégrant des polices de caractères spécifiques et en optimisant l'espacement des textes.

## Proposed Changes

### [Shared] Ressources & Configuration

#### [MODIFY] [index.html](file:///C:/Users/UTILISATEUR/galant-app/web/index.html)
- Importer les polices Google Fonts :
    - **Playfair Display** (Serif) : Pour les titres émotionnels et le prestige.
    - **Montserrat** (Sans-serif) : Pour une interface moderne, géométrique et lisible.

#### [MODIFY] [tailwind.config.js](file:///C:/Users/UTILISATEUR/galant-app/web/tailwind.config.js)
- Étendre le thème Tailwind :
    - `fontFamily.serif` : Configurer 'Playfair Display' comme police sérif par défaut.
    - `fontFamily.sans` : Configurer 'Montserrat' comme police sans-sérif par défaut.
    - `letterSpacing.prestige` : Ajouter un espacement personnalisé (`0.25em`) pour les labels en majuscules.

### [Web Mobile] Application du Style (Phase 1 : Découverte)

#### [MODIFY] [DiscoverPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverPage.tsx)
- Appliquer `font-serif` sur le titre principal "Découvrir".
- Appliquer `tracking-prestige` sur tous les labels en majuscules (ex: "DÉCOUVRE DE NOUVELLES PERSONNES", "STORIES", "VÉRIFIÉ JUMIA").
- Harmoniser les graisses de police : utiliser des poids plus légers (`font-medium` ou `font-light`) pour les textes espacés.

## User Review Required

> [!NOTE]
> L'utilisation d'une police Serif (avec empattements) pour les titres est un changement majeur qui donne immédiatement un aspect "Magazine" ou "Conciergerie". Le texte Montserrat apportera la clarté nécessaire pour le reste de l'application.

## Verification Plan

### Manual Verification
1.  Ouvrir la page **Découverte**.
2.  Vérifier que le titre "Découvrir" a changé d'aspect (élégance classique).
3.  Vérifier que les textes en majuscules sont plus aérés et prestigieux.
4.  Tester la lisibilité globale sur écran mobile.
