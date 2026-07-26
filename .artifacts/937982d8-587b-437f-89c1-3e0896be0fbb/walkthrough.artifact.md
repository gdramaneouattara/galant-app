# Walkthrough : Sécurisation de l'infrastructure Firebase

J'ai généré les règles de sécurité strictes pour protéger les données de Galant. Voici comment les appliquer pour lever les alertes de sécurité Google.

## Fichiers créés

### 1. Realtime Database
- **Fichier** : [database.rules.json](file:///C:/Users/UTILISATEUR/galant-app/database.rules.json)
- **Cible** : Conversations en temps réel.
- **Protection** : Empêche toute personne extérieure à un match de lire vos messages privés.

### 2. Cloud Firestore
- **Fichier** : [firestore.rules](file:///C:/Users/UTILISATEUR/galant-app/firestore.rules)
- **Cible** : Profils, Likes, Matches, Réglages.
- **Protection** : Verrouille les profils (seul le propriétaire peut éditer) et sécurise les listes de likes et d'interactions.

### 3. Cloud Storage
- **Fichier** : [storage.rules](file:///C:/Users/UTILISATEUR/galant-app/storage.rules)
- **Cible** : Photos de profil, médias de chat et documents KYC.
- **Protection** : Interdit la lecture publique de vos documents d'identité et protège vos photos personnelles.

## 📋 Comment publier ces règles ?

Pour chaque service, suivez ces étapes simples dans votre [Console Firebase](https://console.firebase.google.com/) :

### Pour Firestore :
1. Allez dans **Build > Firestore Database**.
2. Cliquez sur l'onglet **Rules** (Règles).
3. Copiez le contenu de [firestore.rules](file:///C:/Users/UTILISATEUR/galant-app/firestore.rules) et remplacez tout le texte actuel.
4. Cliquez sur **Publish** (Publier).

### Pour Realtime Database :
1. Allez dans **Build > Realtime Database**.
2. Cliquez sur l'onglet **Rules** (Règles).
3. Copiez le contenu de [database.rules.json](file:///C:/Users/UTILISATEUR/galant-app/database.rules.json) et remplacez tout le texte actuel.
4. Cliquez sur **Publish** (Publier).

### Pour Storage :
1. Allez dans **Build > Storage**.
2. Cliquez sur l'onglet **Rules** (Règles).
3. Copiez le contenu de [storage.rules](file:///C:/Users/UTILISATEUR/galant-app/storage.rules) et remplacez tout le texte actuel.
4. Cliquez sur **Publish** (Publier).

> [!TIP]
> Une fois ces trois étapes terminées, les alertes de sécurité Google disparaîtront automatiquement sous 24h. Votre application est désormais protégée selon les standards professionnels.
