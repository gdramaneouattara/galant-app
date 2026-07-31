# Finalisation du Mode Sombre Global (Web Prestige)

Ce plan vise à corriger toutes les erreurs de contraste et de visibilité en mode sombre sur l'ensemble des pages de la version Web.

## Proposed Changes

### [Web Mobile] Correction Systématique des Couleurs

Je vais modifier tous les composants identifiés lors du scan pour appliquer les variantes `dark:` manquantes :

1.  **Surfaces (Cards & Containers)** :
    - `bg-white` -> `bg-white dark:bg-slate-900`
    - `bg-slate-50` -> `bg-slate-50 dark:bg-slate-800/50`
2.  **Textes (Headings & Body)** :
    - `text-slate-900` -> `text-slate-900 dark:text-white`
    - `text-slate-700` -> `text-slate-700 dark:text-slate-200`
    - `text-slate-800` -> `text-slate-800 dark:text-slate-200`
3.  **Éléments d'interface (Inputs & Borders)** :
    - `border-slate-100/200` -> `dark:border-white/10`
    - `bg-slate-50` (inputs) -> `dark:bg-white/5`

### Pages priorisantes :
- `ChatPage.tsx` : Bulles de message et barre de saisie.
- `AgendaPage.tsx` : Filtres et cartes d'événements.
- `GuidePage.tsx` : Cartes des établissements et recherche.
- `ProfilePage.tsx` : Tous les textes de paramètres.
- `SentinelPage.tsx` : Champs de saisie du rendez-vous.
- `Admin/*` : Intégralité du tableau de bord.

## Verification Plan

### Manual Verification
1.  Activer le mode sombre dans les réglages du profil.
2.  Parcourir chaque onglet (Découverte, Messages, Sorties, Apps, Moi).
3.  Vérifier que chaque titre est blanc et que chaque fond est noir/gris très sombre.
4.  Vérifier la lisibilité des formulaires et des boutons.
