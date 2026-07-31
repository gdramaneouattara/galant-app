# Épuration de l'onglet Apps (Focus Prestige - V2)

Ce plan vise à simplifier radicalement l'onglet Apps pour ne mettre en avant que les deux services prioritaires : **Le Marché** et **La Sentinelle**, tout en conservant l'appel à l'action pour les futurs partenaires.

## Proposed Changes

### [Web Mobile] Interface Utilisateur

#### [MODIFY] [AppsPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/AppsPage.tsx)
- **Filtrage des Apps** : Mise à jour de la liste `APPS` pour supprimer les services secondaires et ne conserver que :
    - **Le Marché**
    - **La Sentinelle**
- **Conservation du CTA Partenaire** : Le bloc d'invitation "Rejoignez le Guide Galant" en bas de page est **maintenu** comme demandé.
- **Design** : Les deux cartes restantes seront présentées côte à côte pour un look épuré.

## Verification Plan

### Manual Verification
1.  Ouvrir l'onglet **Apps**.
2.  Vérifier que seuls "Le Marché" et "La Sentinelle" sont présents dans la grille des services.
3.  Vérifier que la bannière "Rejoignez le Guide Galant" est toujours visible en bas.
4.  Vérifier l'alignement visuel global.
