# 🌹 Galant - L'Élégance à chaque rencontre

![Galant Banner](web/public/pwa-192x192.png)

Galant est une plateforme de rencontre premium conçue pour offrir une expérience utilisateur raffinée et sécurisée. Le projet est structuré en monorepo comprenant une application mobile (Expo), une application web (Vite/React) et un backend Node.js.

## 🚀 Fonctionnalités Clés

- **Système de Matchmaking** : Algorithme de score basé sur la galanterie et les intérêts.
- **Stories Galant** : Partagez des moments éphémères en photo ou vidéo (style Instagram).
- **Guide Privilège** : Sélection exclusive des meilleurs lieux (Restaurants, Lounges, Hôtels).
- **Agenda VIP** : Calendrier des soirées et événements de prestige.
- **Abonnement Premium** : Mode invisible, badges certifiés, et outils IA rédactionnels.
- **Paiements Sécurisés** : Intégration complète avec **Paystack** (Mobile Money / Cartes).
- **Vérification KYC** : Processus de certification d'identité pour garantir l'élite de la communauté.

## 🛠️ Stack Technique

- **Mobile** : React Native (Expo SDK 52), TypeScript, Lucide Icons.
- **Web** : React 18, Vite, Tailwind CSS, Lucide Icons.
- **Backend** : Node.js, Express, Firebase Admin SDK.
- **Services Cloud** :
  - **Firebase Auth** : Gestion des utilisateurs.
  - **Firestore** : Base de données temps réel.
  - **Firebase Storage** : Hébergement des médias.
  - **Google Cloud Run** : Hébergement du backend.

## 📁 Structure du Projet

```text
galant-app/
├── android/            # Configuration native Android
├── src/                # Code source Application Mobile (React Native)
│   ├── components/     # Composants UI partagés
│   ├── screens/        # Écrans principaux
│   ├── hooks/          # Logique réutilisable (Custom Hooks)
│   └── lib/            # Clients API et Firebase
├── web/                # Code source Application Web (Vite/React)
│   ├── src/pages/      # Pages de l'application Web
│   └── src/context/    # Gestion de l'Auth et état Global
├── server/             # Backend Node.js (Paystack & Admin)
└── scripts/            # Utilitaires de maintenance et setup
```

## ⚙️ Installation et Configuration

### 1. Prérequis
- Node.js 20+
- Firebase Project (Plan Blaze recommandé pour Cloud Run)
- Compte Paystack

### 2. Configuration des environnements
Créez les fichiers suivants (ignorés par Git) :

#### Mobile (`./.env.local`)
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=VOTRE_CLE_SHA1_RESTREINTE
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
```

#### Web (`./web/.env.local`)
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
```

#### Serveur (`./server/.env`)
```env
PAYSTACK_SECRET_KEY=sk_test_...
FIREBASE_SERVICE_ACCOUNT={"type": "service_account", ...}
```

### 3. Lancement en développement

**Lancer le backend :**
```bash
cd server
npm install
npm run dev
```

**Lancer le web :**
```bash
cd web
npm install
npm run dev
```

**Lancer le mobile :**
```bash
npm install
npx expo start
```

## 🔒 Sécurité et CI/CD

- **GitHub Actions** : Validation automatique du code (linting, typecheck) à chaque push sur `main` et `staging`.
- **Protection des Secrets** : Aucun fichier `.env` ou `service-account.json` n'est commité. Les clés sont gérées via les *Repository Secrets* de GitHub.
- **Staging** : Déploiement automatique sur l'environnement de test avant toute mise en production.

## 🤝 Contribution

1. Créez une branche de fonctionnalité : `git checkout -b feat/nom-ma-fonction`
2. Testez vos changements localement : `npm run typecheck`
3. Fusionnez dans `staging` pour validation.
4. Une fois validé, fusionnez dans `main`.

---
© 2026 Galant App. Tous droits réservés.
