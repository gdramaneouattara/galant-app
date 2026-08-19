# Adoption de la Typographie "Facebook Style" (Version Web Uniquement)

Ce plan vise à supprimer l'aspect "fantaisiste" de la version Web de Galant en remplaçant les polices actuelles par le standard sobre et efficace de Facebook (Meta).

## Diagnostic
- **Actuel** : Utilisation de `Playfair Display` (Sérif décoratif) sur les titres et `Inter` ailleurs.
- **Cible** : Une interface 100% propre utilisant les polices système (San Francisco, Roboto, Segoe UI) pour un rendu "App Native" ultra-lisible.

## Proposed Changes

### [Web] Configuration des polices

#### [MODIFY] [tailwind.config.js](file:///C:/Users/UTILISATEUR/galant-app/web/tailwind.config.js)
- Redéfinir `sans` et `serif` pour pointer vers le stack système de Facebook :
  `"Optimistic Text", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- **Note** : En redéfinissant `serif` avec une police sans empattement, nous neutralisons instantanément l'aspect "fantaisiste" sans risquer de casser la mise en page.

#### [MODIFY] [index.html](file:///C:/Users/UTILISATEUR/galant-app/web/index.html)
- Supprimer les liens Google Fonts vers `Playfair Display`.
- Conserver `Inter` comme option de secours ou passer totalement en système.

### [Web] Nettoyage du Design

#### [MODIFY] Tous les fichiers .tsx (web/src/pages/)
- Supprimer les classes `italic` sur les titres (H1, H2, H3) qui étaient utilisées pour donner un style "Magazine".
- Remplacer les classes `font-serif` par `font-sans` là où c'est nécessaire pour une uniformité totale.

## User Review Required

> [!IMPORTANT]
> **Impact Visuel** : L'application passera d'un style "Luxe Classique / Mode" à un style "Luxe Technologique / Professionnel". C'est le style adopté par les plus grandes applications mondiales pour inspirer la sécurité et la solidité.

## Verification Plan

### Manual Verification
1.  **Vérification Navigation** : S'assurer que les titres dans le Guide et les Messages sont nets et droits.
2.  **Vérification Profils** : Le nom et l'âge doivent être écrits de manière robuste (non-italique).
3.  **Vérification Performance** : Constater que la page se charge plus vite sans télécharger les polices externes.
