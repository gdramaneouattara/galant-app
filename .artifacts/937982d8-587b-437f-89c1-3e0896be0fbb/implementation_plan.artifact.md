# Automatisation du retour après vérification d'email

Ce plan vise à fluidifier l'expérience utilisateur après l'inscription en automatisant la redirection vers l'application dès que l'email est vérifié, sans action manuelle requise.

## User Review Required

> [!IMPORTANT]
> - L'utilisateur sera redirigé vers l'application via un paramètre `continueUrl` dans l'email de vérification Firebase.
> - Si l'onglet d'inscription reste ouvert, l'application détectera automatiquement la validation de l'email via un mécanisme de "polling" (vérification périodique en arrière-plan).

## Proposed Changes

### [Web] Authentification

#### [MODIFY] [AuthPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/AuthPage.tsx)
- Configurer `ActionCodeSettings` pour inclure une URL de redirection (`window.location.origin + '/auth'`).
- Mettre à jour l'appel à `sendEmailVerification` pour utiliser ces réglages.
- Ajouter un `useEffect` qui, lorsque le mode est `verify`, appelle `user.reload()` toutes les 3 secondes.
- Si `user.emailVerified` devient vrai, rediriger automatiquement vers la page d'accueil.

### [Mobile] Authentification

#### [MODIFY] [AuthMethodStep.tsx](file:///C:/Users/UTILISATEUR/galant-app/src/screens/auth/components/AuthMethodStep.tsx)
- Ajouter l'appel à `sendEmailVerification` après la création de compte réussie.
- Utiliser `ActionCodeSettings` avec le package Android (`com.ouattara.galant`) pour tenter d'ouvrir l'application directement lors du clic sur le lien.
- Implémenter la même logique de détection automatique (polling) du statut de vérification.

## Verification Plan

### Manual Verification
1. Créer un nouveau compte sur la version Web.
2. Rester sur la page "Vérification".
3. Dans un autre onglet ou sur votre téléphone, valider l'email reçu.
4. Vérifier que la page d'inscription se ferme toute seule et vous amène à l'onboarding.
5. Tester le bouton "Continuer" sur la page de succès de Firebase pour voir s'il ramène bien à l'application.
