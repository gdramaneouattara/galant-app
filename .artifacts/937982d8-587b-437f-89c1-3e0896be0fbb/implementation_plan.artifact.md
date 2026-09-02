# Correction de la Publication de Stories Vidéos (Web)

Ce plan vise à résoudre les échecs de publication de vidéos dans les Stories sur la version Web, en renforçant la robustesse de la chaîne de traitement (client et serveur).

## Proposed Changes

### [Server] Robustesse du Traitement Vidéo

#### [MODIFY] [mediaController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/mediaController.js)
- **Fallback Universel** : Autoriser l'utilisation du fichier original comme "dernier recours" pour les Stories (comme c'est déjà le cas pour le Chat) si la compression échoue, à condition que le fichier respecte les limites de durée.
- **Optimisation FFmpeg** : Ajuster les options de sortie pour être plus tolérant aux formats d'entrée variés (notamment les fichiers .mov d'iPhone).

#### [MODIFY] [mediaRoutes.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/routes/mediaRoutes.js)
- **MimeTypes élargis** : Ajouter plus de variantes de MimeTypes acceptés (ex: `video/x-matroska`, `application/mp4`) pour éviter les rejets "invalid_video_type" lors de l'upload depuis certains navigateurs mobiles.

### [Web] Optimisation de l'Expérience d'Upload

#### [MODIFY] [StoriesPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/StoriesPage.tsx)
- **Gestion d'Erreur Affinée** : Améliorer le bloc `catch` de `handleFileUpload` pour afficher des messages plus précis si le serveur renvoie une erreur spécifique.
- **Logs de Diagnostic** : Ajouter des logs en console pour identifier précisément quelle étape (compression, upload média ou création de statut) échoue.

#### [MODIFY] [videoOptimization.ts](file:///C:/Users/UTILISATEUR/galant-app/web/src/lib/videoOptimization.ts)
- **Sécurisation de la Compression** : Si la capture audio échoue, tenter quand même la compression sans son au lieu d'abandonner et de renvoyer le fichier original potentiellement trop lourd.

## User Review Required

> [!IMPORTANT]
> **Compatibilité Navigateur** : La compression vidéo dans le navigateur (Canvas + MediaRecorder) est une technologie sensible. Les améliorations apportées permettront de basculer intelligemment sur le traitement serveur si le navigateur de l'utilisateur est limité.

## Verification Plan

### Automated Tests
- Lancer `npm run test:quality` pour s'assurer que les routes de média et de stories restent fonctionnelles.

### Manual Verification
1.  **Test iPhone (.mov)** : Tenter de publier une story vidéo depuis un iPhone sur la version Web.
2.  **Test Android (.mp4)** : Tenter la même opération depuis un téléphone Android.
3.  **Test Vidéo Lourde** : Vérifier que le système gère correctement une vidéo de plus de 20MB.
