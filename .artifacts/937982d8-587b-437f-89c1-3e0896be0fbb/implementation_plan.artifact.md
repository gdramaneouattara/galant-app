# Correction de la navigation : Retour vers le Guide

Ce plan vise à corriger le bouton "RETOUR" de la page d'inscription partenaire pour qu'il ramène l'utilisateur à sa page d'origine (notamment le Guide), au lieu de le renvoyer systématiquement vers la page de connexion.

## Proposed Changes

### [Web Mobile] Navigation & Expérience

#### [MODIFY] [PartnerSignupPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/PartnerSignupPage.tsx)
- Importer `useLocation` de `react-router-dom`.
- Utiliser `location.state?.from` pour déterminer la destination du bouton "RETOUR".
- Utiliser `navigate(-1)` comme alternative ou un fallback vers `/auth`.

#### [MODIFY] [GuidePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/GuidePage.tsx)
- Mettre à jour l'action du bouton "Inscrire mon établissement" pour passer l'URL actuelle (`/experiences`) dans le state de navigation.

#### [MODIFY] [AppsPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/AppsPage.tsx)
- Ajouter le state `{ from: '/apps' }` au lien vers l'inscription partenaire.

#### [MODIFY] [AuthPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/AuthPage.tsx)
- Ajouter le state `{ from: '/auth' }` lors de la navigation vers l'inscription partenaire.

## User Review Required

> [!NOTE]
> **Expérience Utilisateur** : Cette correction permet de conserver le contexte de navigation de l'utilisateur. S'il consultait le Guide et a voulu voir les conditions partenaires, il pourra y retourner exactement là où il en était.

## Verification Plan

### Manual Verification
1.  Ouvrir le **Guide Galant**.
2.  Cliquer sur "Inscrire mon établissement".
3.  Sur la page d'inscription, cliquer sur le bouton "RETOUR".
4.  Vérifier que l'on revient bien sur le **Guide** (et non sur la page de connexion).
5.  Répéter le test depuis l'onglet **Apps**.
