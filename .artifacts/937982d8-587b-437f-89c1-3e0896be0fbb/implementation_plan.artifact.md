# Lancement des Services de Prestige (Web Push)

Ce plan vise à intégrer la demande de permission des notifications de manière naturelle et prestigieuse à la fin du parcours d'inscription, évitant ainsi l'interruption technique brutale du navigateur.

## Proposed Changes

### [Web Mobile] Parcours d'Onboarding

#### [MODIFY] [OnboardingPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/OnboardingPage.tsx)
- **Nouvelle Étape (Step 6)** : "Activation des Services".
- Cette étape sera affichée immédiatement après la soumission du dossier (Step 5).
- **Contenu** : Un message de félicitations haut de gamme :
    - *"Dossier validé. Votre expérience Galant commence maintenant."*
    - *"Nous activons votre protection La Sentinelle et vos alertes de rencontres pour une réactivité maximale."*
- **Bouton d'action** : "ACTIVER MON EXPÉRIENCE".
- **Logique** :
    - Le clic sur ce bouton appellera `registerWebPushToken()` (qui déclenchera la demande de permission du navigateur).
    - Une fois l'action terminée (acceptée ou non), l'utilisateur sera redirigé vers la page d'accueil.

#### [MODIFY] [AuthContext.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/context/AuthContext.tsx)
- Retirer l'appel automatique à `registerWebPushToken` lors de la connexion initiale pour ne pas harceler l'utilisateur s'il n'est pas encore passé par l'étape d'activation.

## User Review Required

> [!NOTE]
> Cette approche transforme une contrainte technique (le pop-up de permission) en une **validation de service de luxe**. L'utilisateur a le sentiment d'activer sa protection plutôt que de subir un réglage informatique.

## Verification Plan

### Manual Verification
1.  Créer un nouveau compte sur la version Web.
2.  Parcourir toutes les étapes de l'inscription.
3.  Vérifier qu'après avoir accepté le manifeste, la nouvelle page d'activation apparaît.
4.  Cliquer sur "ACTIVER MON EXPÉRIENCE".
5.  Vérifier que la demande de permission du navigateur apparaît à ce moment précis.
6.  Vérifier que la redirection vers l'accueil se fait correctement après le clic.
