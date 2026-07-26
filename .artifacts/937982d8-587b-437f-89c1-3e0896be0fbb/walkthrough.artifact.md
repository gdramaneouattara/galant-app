# Walkthrough : Correction du compteur de Likes

J'ai corrigé le problème où le nombre de likes d'un profil ne s'incrémentait pas automatiquement lors d'un nouveau Like reçu.

## Changements effectués

### [Serveur]
- **[matchmakingController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/matchmakingController.js)** :
    - Ajout d'une étape de mise à jour atomique dans la fonction `handleSwipe`.
    - Désormais, dès qu'un utilisateur clique sur "Like" (Cœur), le champ `likes_count` du profil de la personne visée est immédiatement incrémenté de **+1** dans la base de données Firestore.
    - Cette opération est sécurisée et garantit que le compteur reflète toujours la réalité des marques d'intérêt reçues.

## Résultats de la Vérification

### Intégrité des données
- L'incrémentation est gérée côté serveur pour éviter toute fraude ou erreur de calcul.
- La persistance est assurée dans la collection `profiles`.

### Déploiement
- Les modifications sont déployées et actives sur les branches **staging** et **main**.

> [!NOTE]
> Pour voir le compteur passer de 0 à 1 sur votre profil, l'utilisateur destinataire doit simplement rafraîchir sa page ou naviguer vers l'onglet Messages. Le serveur renvoie désormais la valeur exacte mise à jour.
