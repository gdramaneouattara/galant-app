# Implémentation de la Sérénade Vocale (Web)

Ce plan vise à porter la fonctionnalité "Sérénade Vocale" (Voice Messages à écoute unique) sur la version Web, en garantissant une parité totale avec l'expérience mobile native.

## Proposed Changes

### [Web Mobile] Infrastructure Audio

#### [NEW] [audioRecording.ts](file:///C:/Users/UTILISATEUR/galant-app/web/src/lib/audioRecording.ts)
- Utilisation de l'API `MediaRecorder` du navigateur.
- Logique d'enregistrement, de pause et de conversion en Blob audio (format `audio/webm` ou `audio/mp4` selon compatibilité).

#### [NEW] [VoicePlayer.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/VoicePlayer.tsx)
- Composant de lecture audio élégant.
- Gestion de l'état "Écoute unique" : appel au serveur pour marquer la sérénade comme lue dès la fin de la lecture.
- Design Prestige (Playfair Display).

### [Web Mobile] Interface de Chat

#### [MODIFY] [ChatPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ChatPage.tsx)
- **Zone de saisie** : Ajouter le bouton Micro (icône `Mic`).
- **Mode Enregistrement** : Afficher un état visuel pulsant lors de la capture vocale.
- **Affichage des messages** : Intégrer le `VoicePlayer` pour les messages de type `VOICE`.
- **Support des métadonnées** : Gérer le flag `is_serenade` et l'état `played_at` pour le verrouillage visuel.

### [Server] Service de Médias

#### [MODIFY] [mediaController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/mediaController.js)
- S'assurer que l'upload supporte les formats audio web.

## User Review Required

> [!IMPORTANT]
> **Expérience Utilisateur** : Sur Web, le navigateur demandera l'autorisation d'accéder au micro lors du premier clic. Nous utiliserons une approche similaire au Web Push pour rendre cette demande "naturelle".

## Verification Plan

### Manual Verification
1.  **Mobile -> Web** : Envoyer une sérénade depuis un téléphone et l'écouter sur Web. Vérifier qu'elle expire bien après lecture.
2.  **Web -> Mobile** : Enregistrer une sérénade sur Web et l'écouter sur téléphone.
3.  **Qualité Audio** : Vérifier que le son est clair et que le fichier est optimisé (léger).
