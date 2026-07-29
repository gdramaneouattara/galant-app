# Sécurisation des données sensibles (La Sentinelle)

Ce plan vise à garantir une isolation totale des données de sécurité (contacts d'urgence, détails de rendez-vous) afin qu'elles ne soient jamais visibles par d'autres utilisateurs, même en cas de session partagée sur un navigateur.

## User Review Required

> [!WARNING]
> **Fuite de données détectée** : J'ai identifié que le serveur renvoyait par défaut l'intégralité du profil (incluant les contacts d'urgence) lors des suggestions de découverte. Ce correctif va restreindre les données envoyées au strict nécessaire (Nom, Bio, Photos, Ville).

## Proposed Changes

### [Server] Module Matchmaking

#### [MODIFY] [matchmakingController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/matchmakingController.js)
- Dans la fonction `getSuggestions`, ne plus utiliser le spread `...c`.
- Créer explicitement l'objet de retour pour n'inclure que les champs publics : `id`, `name`, `age`, `bio`, `photos`, `city`, `is_verified`, `is_premium`, `galanterie_score`, etc.
- **Exclure systématiquement** `emergency_contacts` et toute autre donnée privée des suggestions envoyées aux autres membres.

### [Web Mobile] Isolation de l'Interface

#### [MODIFY] [SentinelPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/SentinelPage.tsx)
- **Réinitialisation par utilisateur** : Ajouter un `useEffect` qui surveille `profile.id`. Dès que l'utilisateur change (déconnexion/reconnexion), tous les états locaux (`contacts`, `location`, `personName`, etc.) sont vidés ou réinitialisés avec les données du nouveau profil.
- **Correctif technique** : Importer `useAuth` qui était manquant.

### [Firebase] Règles de sécurité

#### [MODIFY] [firestore.rules](file:///C:/Users/UTILISATEUR/galant-app/firestore.rules)
- **Protection par champ** : Bien que Firestore ne permette pas nativement de masquer des champs lors d'un `read` global, je vais recommander de séparer les données sensibles.
- En attendant, le correctif Backend (ci-dessus) est la barrière la plus efficace.

## Verification Plan

### Manual Verification
1.  Se connecter avec le Compte A et renseigner des contacts d'urgence.
2.  Intercepter (via l'inspecteur réseau) l'appel à `/api/matchmaking/suggestions`.
3.  Vérifier que le profil du Compte A n'affiche plus le champ `emergency_contacts`.
4.  Sur le même navigateur, se déconnecter du Compte A et se connecter au Compte B.
5.  Aller sur la page **La Sentinelle** et vérifier qu'aucune information du Compte A ne subsiste.
