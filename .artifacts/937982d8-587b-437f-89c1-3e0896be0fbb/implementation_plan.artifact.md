# Harmonisation Typographique "Web Prestige"

Ce plan vise à appliquer l'identité visuelle de luxe (Playfair Display, Montserrat et espacement Prestige) à l'intégralité des pages de la version Web Mobile de Galant.

## Proposed Changes

### [Web] Généralisation du style sur toutes les pages

Je vais passer sur chaque fichier dans `web/src/pages/` pour appliquer la hiérarchie visuelle validée sur la page Découverte :

1.  **Titres Principaux (H2, H3 selon le contexte)** :
    - Classe : `font-serif italic tracking-tighter`.
    - Effet : Look "Éditorial" haut de gamme.

2.  **Labels et Sous-titres en Majuscules** :
    - Classe : `uppercase tracking-prestige font-medium`.
    - Effet : Élégance technique et aération.

3.  **Pages concernées** :
    - `AppsPage.tsx` (Hub des services)
    - `ProfilePage.tsx` & `ProfileDetailPage.tsx`
    - `MarketPage.tsx` (Comparateur de prix)
    - `SentinelPage.tsx` (Sécurité)
    - `PremiumPage.tsx` & `BoostPage.tsx` (Monétisation)
    - `MatchesPage.tsx` & `ChatPage.tsx` (Interactions)
    - `AuthPage.tsx` & `OnboardingPage.tsx` (Entrée dans l'app)
    - Toutes les pages de contenu (Guide, Expériences, Agenda, CGU, Privacy).

## Verification Plan

### Automated Tests
- Relancer `npm run test:quality` pour valider l'intégrité de la navigation.

### Manual Verification
- Naviguer sur l'ensemble de l'application Web pour vérifier que l'unité de style est respectée sans exception.
- Vérifier que les polices se chargent correctement (Playfair pour les titres, Montserrat pour le texte).
- S'assurer que le `tracking-prestige` ne nuit pas à la lisibilité sur les petits écrans.
