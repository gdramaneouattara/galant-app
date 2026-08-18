# Guide Galant : Conseil Conciergerie (Partenaires GPS)

Ce plan vise à informer les utilisateurs de l'existence de l'outil "Partenaires autour de moi" (onglet Apps) lorsqu'ils consultent le Guide, afin d'améliorer leur expérience de proximité.

## Proposed Changes

### [Web Mobile] Interface du Guide

#### [MODIFY] [GuidePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/GuidePage.tsx)
- **Ajout d'une bannière informative** :
    - Position : Juste en dessous de la barre de recherche et au-dessus de la grille des lieux.
    - Design : Style "Conciergerie Privée" (fond sombre ou ambre léger, bordure raffinée).
    - Icône : `MapPin` (Géo-localisation).
- **Contenu du message (FR)** :
    - Titre : *"À proximité ?"*
    - Corps : *"Pour découvrir les établissements les plus proches de votre position actuelle, utilisez notre outil intelligent dans l'onglet Apps."*
- **Action** :
    - Bouton : *"Voir les Partenaires"*.
    - Destination : Redirection vers `/apps`.

## User Review Required

> [!TIP]
> **Expérience Utilisateur** : Cette bannière agira comme un guide humain (un concierge) qui suggère une meilleure option à l'utilisateur, ce qui renforce le côté haut de gamme du service.

## Verification Plan

### Manual Verification
1.  Ouvrir le **Guide Galant**.
2.  Vérifier que le message de conseil apparaît clairement entre la recherche et la liste des lieux.
3.  Cliquer sur le bouton d'action et vérifier qu'il redirige bien vers la page **Apps**.
4.  Vérifier que le message est bien traduit si l'utilisateur change la langue de l'app.
