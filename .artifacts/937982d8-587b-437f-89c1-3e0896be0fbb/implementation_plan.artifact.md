# Modernisation et Fiabilisation du CI/CD (Outils GitHub 2026)

Ce plan vise à résoudre définitivement les erreurs de déploiement GitHub Pages en mettant à jour les outils vers leurs versions 2026 et en adoptant une structure de build plus robuste.

## Diagnostic
- **Avertissement Node.js 24** : L'action `actions/setup-node@v4` est officiellement obsolète. Il faut passer à la **v7** qui tourne nativement sous Node 24.
- **Erreur "Multiple artifacts"** : C'est un bug connu de GitHub qui survient lorsqu'on clique sur "Re-run jobs". L'action de téléchargement crée des doublons de l'archive `github-pages`, ce qui bloque le déploiement.
- **Solution** : Adopter la structure en **deux jobs séparés** (Build puis Deploy) recommandée par GitHub pour isoler proprement les étapes et éviter les collisions d'artefacts.

## Proposed Changes

### [CI/CD] Mise à jour vers les versions 2026

#### [MODIFY] Tous les workflows (.github/workflows/)
- `actions/setup-node@v4` -> **`@v7`** (Compatibilité Node 24 native)
- `actions/checkout@v7` (Déjà à jour, mais vérification de la cohérence)

#### [MODIFY] [deploy-web.yml](file:///.github/workflows/deploy-web.yml)
- **Refonte Structurelle** : Séparation en deux jobs (`build` et `deploy`).
- **Fiabilisation** : Utilisation des dernières versions des actions de Pages :
    - `actions/upload-pages-artifact@v5`
    - `actions/deploy-pages@v5`
- **Sécurité** : Application stricte des permissions minimales requises.

## User Review Required

> [!IMPORTANT]
> **Fresh Run** : Une fois ces modifications appliquées, ne cliquez pas sur "Re-run failed jobs". Faites un nouveau `git push`. Cela créera une **nouvelle exécution** avec un dossier d'artefacts vide, résolvant ainsi l'erreur de "Multiple artifacts".

## Verification Plan

### Automated Verification
1.  Faire un `git push origin staging`.
2.  Vérifier dans GitHub Actions que l'étape "Setup Node.js" utilise bien la version **v7**.
3.  Vérifier que les deux jobs (Build et Deploy) s'enchaînent correctement.
4.  Confirmer que l'avertissement de dépréciation a disparu.
