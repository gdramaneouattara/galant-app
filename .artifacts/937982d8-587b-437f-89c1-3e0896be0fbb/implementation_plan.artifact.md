# Automatisation via Pont de Notifications (Smartphone Relais)

Ce plan vise à automatiser le déblocage des services sur Galant en interceptant les notifications de paiement Wave Business sur un smartphone Android dédié.

## Proposed Changes

### [Server] Réception des signaux du Smartphone

#### [NEW] [notificationBridgeController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/notificationBridgeController.js)
- `receivePaymentSignal` :
    - Reçoit le montant et le numéro de téléphone (ou texte brut) envoyés par le smartphone.
    - Utilise une **Clé Secrète de Pont** (Bridge Key) pour vérifier que l'envoi vient bien de votre téléphone.
    - Identifie l'utilisateur Galant correspondant au numéro d'expéditeur.
    - Appelle `applyPurchasedEntitlement` pour activer le service.
    - Gère les cas où plusieurs achats sont en attente (choisit le plus récent ou correspondant au montant).

#### [MODIFY] [paymentRoutes.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/routes/paymentRoutes.js)
- Ajouter la route `/api/payments/bridge/signal`.

### [Web Mobile] Guide Utilisateur

#### [MODIFY] [InteractionPurchaseModal.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/InteractionPurchaseModal.tsx)
- Informer l'utilisateur : *"Utilisez votre numéro de téléphone Galant pour payer. Activation automatique sous 30 secondes."*

### [Android] Configuration Smartphone Relais (Instructions)
- Je fournirai une configuration pour une application comme **MacroDroid** (gratuite et simple) qui fera le lien entre Wave et votre serveur.

## User Review Required

> [!IMPORTANT]
> **Fiabilité du numéro** : Pour que l'automatisation fonctionne, le client doit payer avec le même numéro de téléphone que celui utilisé sur son compte Galant. S'il utilise un autre numéro, la validation devra rester manuelle via l'espace Admin.

## Verification Plan

### Automated Tests
- Envoyer une fausse notification de paiement au serveur avec une Bridge Key valide et vérifier l'activation du Premium.

### Manual Verification
1.  Installer MacroDroid sur le téléphone Wave Business.
2.  Simuler une notification Wave.
3.  Vérifier que le serveur Galant reçoit l'information et débloque le service instantanément.
