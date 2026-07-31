# Optimisation de la Performance & Réduction des Coûts (Prêt pour 1000+)

Ce plan vise à préparer l'application Galant pour une montée en charge à plus de 1000 utilisateurs en optimisant la consommation de bande passante et le stockage via une compression d'image systématique et du chargement différé (Lazy Loading).

## Proposed Changes

### [Web Mobile] Optimisation des Images

#### [MODIFY] [OnboardingPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/OnboardingPage.tsx)
- **Compression au premier contact** : Intégrer la fonction `compressImageWeb` lors de l'inscription.
- **Impact** : Réduction immédiate de ~70% de la taille des photos de profil stockées, passant de plusieurs Mo à environ 150-200 Ko par image.

#### [MODIFY] [DiscoverGridPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/DiscoverGridPage.tsx)
- **Chargement Différé (Lazy Loading)** : Ajouter l'attribut `loading="lazy"` aux miniatures de la grille.
- **Impact** : Le navigateur ne téléchargera que les photos visibles à l'écran, économisant ainsi des dizaines de Mo de bande passante lors du défilement d'une grande galerie.

#### [MODIFY] [StoriesPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/StoriesPage.tsx)
- Appliquer `loading="lazy"` aux vignettes de prévisualisation des stories.

### [Shared] Raffinement de la Compression

#### [MODIFY] [imageCompression.ts](file:///C:/Users/UTILISATEUR/galant-app/web/src/lib/imageCompression.ts)
- Vérifier et stabiliser les réglages par défaut (`1080px`, `70% de qualité`) pour garantir un rendu "Prestige" tout en étant ultra-léger.

## User Review Required

> [!TIP]
> **Économies de Cloud** : Ces mesures combinées permettront à votre budget Google Cloud de durer beaucoup plus longtemps. Vous payez moins pour le stockage et presque rien pour le transfert de données inutiles.

## Verification Plan

### Automated Tests
- Relancer `npm run test:quality` pour s'assurer que le flux d'inscription n'est pas ralenti par la compression.

### Manual Verification
1.  **Inscription** : Uploader une photo de 5 Mo et vérifier qu'elle est compressée avant l'envoi (vérifier la taille dans la console Firebase).
2.  **La Galerie** : Faire défiler la grille rapidement et vérifier que les images se chargent au fur et à mesure (Lazy Loading).
3.  **Qualité Visuelle** : S'assurer que les photos restent nettes et dignes du standing Galant après compression.
