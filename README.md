# Galant — React Native (Expo)

Cette base a été convertie du prototype web vers une app mobile React Native / Expo, prête pour pré‑prod.

## Prérequis

- Node.js 18+
- Expo CLI (via `npx expo`)
- Un simulateur iOS/Android ou un device physique

## Installation & lancement

1) Installer les dépendances :
   `npm install`
2) Démarrer Expo :
   `npm run start`
   - En mode offline (évite les appels réseau de validation) :
     `npm run start:offline`
3) Lancer sur un device :
   - Android : `npm run android`
   - iOS : `npm run ios`

## Variables d'environnement (app mobile)

Crée un `.env.local` à la racine :

```
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=VOTRE_CLE_ANON
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8787
```

## Backend Paystack / KYC (pré‑prod)

Un serveur Node est fourni dans `server/` pour :
- Initialiser le paiement Paystack
- Vérifier le paiement et activer le Premium
- Gérer les paiements pour les boosts de profil
- Démarrer le flux KYC (fournisseur configurable)

### Setup

```
cd server
npm install
cp .env.example .env
npm run dev
```

### Variables d'environnement (server)

À renseigner dans `server/.env` :
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_CURRENCY` (ex: XOF)
- `PAYSTACK_CALLBACK_URL` (optionnel)
- `SIMULATE_PAYMENTS=true` (optionnel: désactive Paystack et simule le paiement)
- `PLAN_*_AMOUNT` (montants en plus petite unité)
- `BOOST_*_AMOUNT` (montants en plus petite unité)
- `KYC_PROVIDER` + `KYC_VERIFICATION_URL` (si fournisseur manuel)
- `EXPO_PUSH_ACCESS_TOKEN` (optionnel, recommandé pour push Expo)
- `CORS_ALLOW_ORIGINS` (optionnel, ex: `https://app.galant.com,https://admin.galant.com`)
- `FORCE_HTTPS=true` (optionnel, à activer derrière un reverse proxy TLS)

## Structure

- `App.tsx` : entrée principale (provider + navigation)
- `src/navigation/` : navigation stack + tabs
- `src/screens/` : écrans (auth, home, chat, profile, premium, verify, boost)
- `src/state/` : état global
- `src/lib/` : supabase + API
- `scripts/` : SQL + scripts supabase
- `server/` : backend Paystack / KYC

## Supabase (Cloud)

### Initialiser le schéma + RLS

Dans **SQL Editor** :
1) Exécute `scripts/supabase-schema.sql`
2) Exécute `scripts/supabase-rls-rest-only.sql` avec le rôle **postgres**
3) Exécute `scripts/supabase-rls-storage-only.sql` avec le rôle **supabase_storage_admin**

### Bucket photos

Créer un bucket `photos` et le marquer **Public** dans Storage.

### Buckets privés requis

- `kyc-docs` (privé) : justificatifs KYC (recto/verso/selfie)
- `chat-media` (privé) : photos partagées en messagerie

Tu peux les créer avec :

```bash
npm run create:bucket:kyc
npm run create:bucket:chat
```

## Android SDK (Windows)

Si `adb` est introuvable ou si `ANDROID_HOME` n'est pas défini :

`npm run setup:android`

## Notes

- Les policies RLS sont aussi disponibles dans `scripts/supabase-rls.sql` (version complète).
- Les données sont alimentées par Supabase (plus de données mock).
