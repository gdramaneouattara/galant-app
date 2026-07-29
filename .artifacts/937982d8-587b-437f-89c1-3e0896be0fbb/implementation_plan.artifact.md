# Immersion Totale pour l'Appel Fantôme

Ce plan vise à masquer tous les éléments de l'interface Galant (Logo, Langues, Profil, Navigation) lorsqu'un Appel Fantôme est actif, afin de rendre la simulation indétectable et parfaitement fidèle à un écran d'appel natif.

## Proposed Changes

### [Shared] Contexte d'Authentification

#### [MODIFY] [AuthContext.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/context/AuthContext.tsx)
- Ajouter l'état global `isFakeCallActive` (boolean) et son setter `setIsFakeCallActive`.
- Exposer ces valeurs dans le contexte pour qu'elles soient accessibles partout dans l'application.

### [Web Mobile] Interface de Sécurité

#### [MODIFY] [SentinelPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/SentinelPage.tsx)
- Remplacer l'état local `isFakeCallActive` par l'état global provenant de `useAuth()`.
- S'assurer que l'overlay de l'appel utilise cet état global pour s'afficher.

### [Web Mobile] Mise en page Globale

#### [MODIFY] [App.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/App.tsx)
- Récupérer `isFakeCallActive` depuis `useAuth()`.
- Ajouter une condition pour masquer le composant `<Header />` et le composant `<MobileNav />` si un appel fantôme est en cours.

## Verification Plan

### Manual Verification
1.  Ouvrir **Apps > La Sentinelle**.
2.  Lancer un **Appel Fantôme**.
3.  Vérifier que le bandeau du haut (Logo, Profil) a disparu.
4.  Vérifier que les onglets du bas (Découverte, Messages, etc.) ont disparu.
5.  Raccrocher l'appel et vérifier que toute l'interface Galant réapparaît instantanément.
