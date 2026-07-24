# Résolution de l'écran blanc sur mobile (Web Staging)

Les modifications apportées sécurisent l'initialisation de l'application et corrigent les problèmes de configuration liés au déploiement sur GitHub Pages.

## Changements effectués

### [Vite & Déploiement]
- **[vite.config.ts](file:///C:/Users/UTILISATEUR/galant-app/web/vite.config.ts)** : Ajout d'une détection automatique de l'environnement GitHub Actions. La `base` URL passe de `/` à `/galant-app/` automatiquement lors du build de staging.
- **[App.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/App.tsx)** & **[AuthPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/AuthPage.tsx)** : Conversion des chemins d'images absolus (`/auth-bg.png`) en chemins relatifs (`auth-bg.png`) pour assurer le chargement des assets quel que soit le sous-répertoire d'hébergement.

### [Logique d'Authentification]
- **[AppContext.tsx](file:///C:/Users/UTILISATEUR/galant-app/src/state/AppContext.tsx)** (Mobile) & **[AuthContext.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/context/AuthContext.tsx)** (Web) : Sécurisation du callback `onAuthStateChanged`. L'utilisation d'un bloc `finally` garantit que `setLoading(false)` est appelé, même si la récupération du profil Firestore échoue ou si une erreur réseau survient.
- **[AuthContext.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/context/AuthContext.tsx)** : Ajout de gestionnaires d'erreurs aux écouteurs Firestore (`onSnapshot`) pour éviter les crashs silencieux en cas de problème de permissions.

### [Stabilité de l'API]
- **[api.ts](file:///C:/Users/UTILISATEUR/galant-app/src/lib/api.ts)** : Refactorisation de la détection de plateforme. L'accès à `process.env` est désormais protégé, évitant un crash immédiat dans les navigateurs mobiles ne supportant pas cet objet global.

## Vérification recommandée

1.  **GitHub Secrets** : Assurez-vous que `VITE_FIREBASE_API_KEY` et les autres secrets sont bien définis dans `Settings > Secrets and variables > Actions`.
2.  **Console Navigateur** : Si vous testez sur un téléphone Android, vous pouvez utiliser `chrome://inspect` sur votre ordinateur pour voir les logs exacts si un problème subsiste.
3.  **Clean Build** : Le changement dans `vite.config.ts` forcera Vite à reconstruire les chemins correctement lors du prochain push sur `staging`.
