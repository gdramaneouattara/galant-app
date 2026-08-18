# Amélioration du Confort d'Écriture (Chat Extensible)

Ce plan vise à corriger le champ de saisie du chat qui est actuellement limité à une seule ligne, empêchant la lecture des messages longs avant envoi.

## Proposed Changes

### [Web Mobile] Interface de Chat

#### [MODIFY] [ChatPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ChatPage.tsx)
- **Transition vers Textarea** : Remplacer l'élément `<input>` par un `<textarea>`.
- **Auto-agrandissement vertical** :
    - Utiliser un `useRef` pour manipuler directement la hauteur du composant.
    - Implémenter un effet qui calcule `scrollHeight` à chaque changement de texte pour ajuster la hauteur.
    - Fixer une limite maximale (ex: `max-height: 150px`) pour éviter que le clavier et le champ ne masquent toute la discussion.
- **Optimisation du Design** :
    - S'assurer que les icônes de gauche (Média) et le bouton d'envoi à droite restent alignés au bas du champ extensible.
    - Maintenir le style "Pilule arrondie" même lors de l'agrandissement.
- **Expérience Utilisateur** : Gérer la touche "Entrée" pour envoyer le message (comme actuellement) tout en permettant le saut de ligne via "Shift+Entrée".

## User Review Required

> [!TIP]
> **Confort de relecture** : Cette modification est cruciale pour une application de rencontre premium. Elle permet aux membres de soigner leur premier message (l'accroche) en voyant l'ensemble de leur texte d'un seul coup d'œil.

## Verification Plan

### Manual Verification
1.  Ouvrir une discussion.
2.  Écrire un message court : le champ doit rester sur une seule ligne.
3.  Écrire un message long (plusieurs phrases) : vérifier que le champ s'agrandit verticalement.
4.  Vérifier que les boutons "Envoyer" et "Micro" suivent bien le mouvement vers le bas.
5.  Vérifier que le texte est parfaitement lisible et qu'un scroll interne apparaît si le message est très long.
