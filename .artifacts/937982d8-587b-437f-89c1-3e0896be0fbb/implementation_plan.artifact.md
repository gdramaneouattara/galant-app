# Restriction du Programme Ambassadeur (Invitations Sélectives)

Ce plan vise à restreindre la fonctionnalité "Inviter un ami" aux seuls membres autorisés par l'administrateur, tout en affichant l'option comme un privilège exclusif à débloquer pour les autres membres.

## Proposed Changes

### [Server] Administration des Droits

#### [MODIFY] [adminController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/adminController.js)
- La fonction `toggleUserStatus` est déjà capable de mettre à jour n'importe quel champ du profil. Aucune modification n'est requise côté serveur, mais nous utiliserons le champ `can_invite`.

### [Web Mobile] Espace Admin

#### [MODIFY] [AdminUsers.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/admin/AdminUsers.tsx)
- Ajouter une nouvelle colonne ou une icône d'action "Ambassadeur" (icône `UserPlus` ou `Share2`).
- Permettre à l'administrateur de basculer le flag `can_invite` pour chaque membre.

### [Web Mobile] Interface Profil

#### [MODIFY] [ProfilePage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/ProfilePage.tsx)
- **Logique d'affichage** : Vérifier la valeur de `profile.can_invite`.
- **État Verrouillé** : Si `can_invite` est à `false` :
    - Griser la carte "Inviter un Ami".
    - Ajouter une icône de cadenas 🔒.
    - Modifier le texte pour indiquer que le programme est sélectif (ex: *"Programme Ambassadeur : Sur invitation uniquement"*).
    - Désactiver le clic (copie du lien).
- **État Activé** : Affichage normal et fonctionnel pour les ambassadeurs choisis.

## User Review Required

> [!IMPORTANT]
> **Expérience Utilisateur** : En laissant la carte visible mais verrouillée, vous incitez les membres les plus actifs à vous contacter pour rejoindre le programme, ce qui crée une dynamique de "club privé".

## Verification Plan

### Manual Verification
1.  **Admin** : Ouvrir la gestion des membres, activer le statut "Ambassadeur" pour un compte de test.
2.  **Membre Classique** : Se connecter avec un compte non-autorisé, vérifier que la carte d'invitation est grise et verrouillée.
3.  **Ambassadeur** : Vérifier que la carte redevient colorée et que le lien d'invitation est copiable.
4.  **Admin** : Désactiver le statut et vérifier le verrouillage immédiat côté membre.
