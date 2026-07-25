# Géolocalisation obligatoire lors de l'Onboarding

Ce plan vise à rendre la géolocalisation GPS obligatoire pour tous les nouveaux utilisateurs, supprimant ainsi la saisie manuelle de la ville afin de garantir l'intégrité des données de matchmaking.

## User Review Required

> [!IMPORTANT]
> Cette modification empêchera les utilisateurs de s'inscrire s'ils refusent l'accès GPS ou si leur appareil n'est pas capable de se géolocaliser.

## Proposed Changes

### [Mobile] Écran de Localisation

#### [MODIFY] [LocationStep.tsx](file:///C:/Users/UTILISATEUR/galant-app/src/screens/auth/components/LocationStep.tsx)
- Supprimer les champs `TextInput` pour la ville et le pays.
- Bloquer le bouton "Terminer" tant que les coordonnées GPS n'ont pas été capturées avec succès.
- Ajuster le message d'instruction pour souligner le caractère obligatoire.

### [Web] Page d'Onboarding

#### [MODIFY] [OnboardingPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/OnboardingPage.tsx)
- Supprimer le champ `input` pour la ville dans l'étape 3.
- Désactiver le bouton "Suivant" tant que `formData.latitude` est nul.
- Forcer l'appel à `handleGeoLocation` pour progresser.

## Verification Plan

### Manual Verification
1. Lancer le flux d'inscription sur Mobile et Web.
2. Vérifier qu'il n'y a plus de champ texte pour taper sa ville.
3. Vérifier que le bouton de progression est grisé par défaut.
4. Cliquer sur "Détecter ma position" et vérifier que le bouton se débloque une fois la ville détectée.
