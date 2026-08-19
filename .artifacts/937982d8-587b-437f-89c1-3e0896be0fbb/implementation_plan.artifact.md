# Interface Chat Pleine Largeur (Suppression des marges)

Ce plan vise à rendre l'interface de discussion plus immersive en supprimant les marges latérales externes et internes qui limitent l'espace de lecture sur la version Web.

## Proposed Changes

### [Web Mobile] Mise en page globale

#### [MODIFY] [App.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/App.tsx)
- **Déverrouillage du Layout** : Ajouter la route `/chat` à la liste des exceptions qui ne subissent pas le `max-w-6xl` et le `p-4` global.
- **Impact** : Le conteneur du chat pourra utiliser 100% de la largeur du navigateur.

#### [MODIFY] [ChatPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ChatPage.tsx)
- **Élargissement du composant** :
    - Remplacer `max-w-2xl mx-auto` par `w-full`.
    - Ajuster la hauteur de `h-[80vh]` à `h-[calc(100vh-theme(spacing.20))]` pour une meilleure utilisation de l'écran vertical également.
- **Optimisation des bordures** : Supprimer `rounded-[2.5rem]` et `border` sur les côtés pour un rendu "Edge-to-Edge" (bord à bord) plus moderne.
- **Raffinage interne** : Réduire les paddings horizontaux (`p-6` -> `p-4`) pour gagner encore plus d'espace pour le texte des messages.

## User Review Required

> [!TIP]
> **Rendu Visuel** : Sur ordinateur, le chat sera très large (style Facebook Messenger). Sur mobile, il remplira parfaitement l'écran sans laisser de fines bandes sombres sur les côtés.

## Verification Plan

### Manual Verification
1.  Ouvrir une discussion sur Web.
2.  Vérifier que le cadre de discussion touche les bords gauche et droit du navigateur.
3.  Vérifier que le header (nom du contact) et le footer (saisie message) sont bien alignés sur toute la largeur.
4.  Vérifier que les autres pages (Profil, Découverte) conservent bien leurs marges de sécurité habituelles.
