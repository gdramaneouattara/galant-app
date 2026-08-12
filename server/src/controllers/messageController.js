const { db, rtdb } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const { analyzeMessageWithAI } = require('../services/aiService');
const { hasDirectMessagePurchase } = require('../services/usageService');
const { createInternalNotification, NOTIFICATION_TYPES } = require('../services/notificationCenterService');
const { QUOTAS, ALLOWED_REPORT_REASONS } = require('../config/constants');

const hasPriorVenueSuggestionForReply = async (messagesRef, meId, metadata = {}) => {
  const sourceMessageId = String(metadata.source_message_id || '').trim();
  const venueId = String(metadata.venue_id || '').trim();
  if (!sourceMessageId || !venueId) return false;

  const snapshot = await messagesRef.once('value');
  if (!snapshot.exists()) return false;

  let found = false;
  let alreadyConsumed = false;
  snapshot.forEach(child => {
    if (found && alreadyConsumed) return;
    const message = child.val() || {};
    const messageVenueId = String(message.metadata?.venue?.id || '').trim();
    const isExpectedSource = child.key === sourceMessageId;
    const isExpectedVenue = messageVenueId === venueId;
    const isReceivedVenueSuggestion =
      message.sender_id !== meId &&
      message.message_type === 'VENUE_SUGGESTION' &&
      isExpectedSource &&
      isExpectedVenue;

    if (isReceivedVenueSuggestion) found = true;

    const consumedSourceId = String(
      message.metadata?.consumes_source_message_id ||
      message.metadata?.source_message_id ||
      ''
    ).trim();
    const consumedVenueId = String(message.metadata?.venue_id || '').trim();
    const isConsumedReply =
      message.sender_id === meId &&
      message.message_type === 'TEXT' &&
      message.metadata?.reply_kind === 'VENUE_SUGGESTION_OPINION' &&
      consumedSourceId === sourceMessageId &&
      consumedVenueId === venueId;

    if (isConsumedReply) alreadyConsumed = true;
  });

  return found && !alreadyConsumed;
};

/**
 * Sends a message.
 * Persistent thread state in Firestore, messages in Realtime DB.
 */
const sendMessage = async (req, res) => {
  const { matchId, venueChatId, content, recipientId, messageType, mediaPath } = req.body;
  const me = req.user;
  const normalizedType = String(messageType || 'TEXT').toUpperCase();
  const normalizedContent = typeof content === 'string' ? content.trim() : '';
  const metadata = req.body.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {};
  const isVenueSuggestionOpinion =
    normalizedType === 'TEXT' &&
    metadata.reply_kind === 'VENUE_SUGGESTION_OPINION';

  try {
    if (matchId) {
      const matchDoc = await db.collection('matches').doc(matchId).get();
      if (!matchDoc.exists) return res.status(404).json({ error: 'match_not_found' });

      const match = matchDoc.data();
      if (match.status === 'BLOCKED') return res.status(403).json({ error: 'conversation_blocked' });
      if (match.status === 'UNMATCHED') return res.status(403).json({ error: 'conversation_unmatched' });

      // AI Moderation
      if (content && typeof content === 'string') {
        const aiAnalysis = await analyzeMessageWithAI(content);
        if (!aiAnalysis.isSafe) {
          return res.status(400).json({ error: 'ai_moderation_triggered', message: aiAnalysis.suggestion });
        }
      }

      // Premium/Quota checks for engagement
      if (!me.is_premium && me.gender === 'MALE') {
        const otherUserId = match.user_one_id === me.id ? match.user_two_id : match.user_one_id;
        const targetUserId = recipientId ? String(recipientId) : otherUserId;

        const targetDoc = await db.collection('profiles').doc(targetUserId).get();
        const targetProfile = targetDoc.data();

        // Check if I am the engager (first message or following my own message)
        const messagesRef = rtdb.ref(`messages/${matchId}`);
        const canReplyToVenueSuggestion = isVenueSuggestionOpinion
          ? await hasPriorVenueSuggestionForReply(messagesRef, me.id, metadata)
          : false;
        const lastMsgSnap = await messagesRef.orderByKey().limitToLast(1).once('value');
        const lastMsg = lastMsgSnap.exists() ? Object.values(lastMsgSnap.val())[0] : null;

        const isEngagement = !lastMsg || lastMsg.sender_id === me.id;

        if (canReplyToVenueSuggestion) {
          // The recipient of a venue card can answer the card without unlocking generic direct messaging.
        } else if (isEngagement) {
          // Allow the VERY FIRST message in a match for free (Mutual match)
          // Consecutive messages (double-texting) still require Premium or Purchase
          const isConsecutive = !!lastMsg && lastMsg.sender_id === me.id;

          if (isConsecutive) {
            const purchased = await hasDirectMessagePurchase(me.id, targetUserId);
            if (!purchased) {
              return res.status(403).json({ error: 'subscription_required', message: "La relance nécessite Premium ou un achat direct." });
            }
          }
        } else if (!targetProfile?.is_premium) {
          // Count messages sent by me in this match
          const allMsgsSnap = await messagesRef.once('value');
          const msgs = allMsgsSnap.exists() ? Object.values(allMsgsSnap.val()) : [];
          const sentByMe = msgs.filter(m => m.sender_id === me.id).length;

          if (sentByMe >= 3) {
            const purchased = await hasDirectMessagePurchase(me.id, targetUserId);
            if (!purchased) {
              return res.status(403).json({
                error: 'payment_required',
                message: "Vous avez utilisé vos 3 réponses gratuites. Débloquez la discussion pour continuer."
              });
            }
          }
        }
      }
    } else if (venueChatId) {
      const vChat = await db.collection('venue_chats').doc(venueChatId).get();
      if (!vChat.exists) return res.status(404).json({ error: 'chat_not_found' });
      const venueChat = vChat.data();
      const venueDoc = await db.collection('venues').doc(venueChat.venue_id).get();
      const venue = venueDoc.exists ? venueDoc.data() : null;
      const isUserParticipant = venueChat.user_id === me.id;
      const isPartnerParticipant = venue?.owner_id === me.id;
      if (!isUserParticipant && !isPartnerParticipant) {
        return res.status(403).json({ error: 'chat_not_authorized' });
      }
    } else {
      return res.status(400).json({ error: 'missing_chat_context' });
    }

    const now = new Date().toISOString();

    const messageData = {
      sender_id: me.id,
      content: normalizedContent || null,
      message_type: normalizedType,
      media_url: mediaPath || null,
      metadata,
      created_at: now,
      is_read: false
    };

    // Store in Realtime Database
    const chatPath = matchId ? `messages/${matchId}` : `venue_messages/${venueChatId}`;
    const newMsgRef = rtdb.ref(chatPath).push();
    await newMsgRef.set(messageData);

    // Update last_message_at in Firestore
    if (matchId) {
      await db.collection('matches').doc(matchId).update({ last_message_at: now });

      // Internal + push notification
      const match = (await db.collection('matches').doc(matchId).get()).data();
      const recipientId = match.user_one_id === me.id ? match.user_two_id : match.user_one_id;
      const body = normalizedType === 'TEXT' ? normalizedContent : `Nouveau média (${normalizedType.toLowerCase()})`;
      void createInternalNotification({
        userId: recipientId,
        type: NOTIFICATION_TYPES.MESSAGE,
        title: `Message de ${me.name}`,
        message: body,
        targetId: matchId,
        metadata: {
          match_id: matchId,
          sender_id: me.id,
          sender_name: me.name,
          message_id: newMsgRef.key,
          message_type: normalizedType,
        },
        dedupeKey: `message_${recipientId}_${matchId}_${newMsgRef.key}`,
        sendPush: true,
        pushData: { matchId, type: 'CHAT' }
      });
    } else if (venueChatId) {
      const vChat = await db.collection('venue_chats').doc(venueChatId).get();
      const venueChat = vChat.exists ? vChat.data() : {};
      const recipientId = venueChat.user_id === me.id ? venueChat.partner_id : venueChat.user_id;
      if (recipientId && recipientId !== me.id) {
        const body = normalizedType === 'TEXT' ? normalizedContent : `Nouveau media (${normalizedType.toLowerCase()})`;
        void createInternalNotification({
          userId: recipientId,
          type: NOTIFICATION_TYPES.PARTNER,
          title: `Message de ${me.name}`,
          message: body,
          targetId: venueChatId,
          metadata: {
            venue_chat_id: venueChatId,
            sender_id: me.id,
            sender_name: me.name,
            message_id: newMsgRef.key,
            venue_id: venueChat.venue_id,
            message_type: normalizedType,
          },
          dedupeKey: `venue_message_${recipientId}_${venueChatId}_${newMsgRef.key}`,
          sendPush: true,
          pushData: { venueChatId, type: 'PARTNER_CHAT' }
        });
      }
    }

    res.json({ id: newMsgRef.key, ...messageData });

  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ error: error.message });
  }
};

const markAsRead = async (req, res) => {
  const { matchId } = req.body;
  const me = req.user;
  try {
    const messagesRef = rtdb.ref(`messages/${matchId}`);
    const snapshot = await messagesRef.once('value');
    if (snapshot.exists()) {
      const updates = {};
      snapshot.forEach(child => {
        if (child.val().sender_id !== me.id && !child.val().is_read) {
          updates[`${child.key}/is_read`] = true;
        }
      });
      await messagesRef.update(updates);
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const createDirectThread = async (req, res) => {
  const me = req.user;
  const { targetUserId } = req.body;

  if (!targetUserId || targetUserId === me.id) return res.status(400).json({ error: 'invalid_target' });

  try {
    const targetDoc = await db.collection('profiles').doc(targetUserId).get();
    if (!targetDoc.exists || targetDoc.data().suspended_at) return res.status(404).json({ error: 'target_not_found' });

    const [u1, u2] = [me.id, targetUserId].sort();
    const matchId = `${u1}_${u2}`;
    const matchRef = db.collection('matches').doc(matchId);
    const matchSnap = await matchRef.get();

    if (matchSnap.exists) {
      const data = matchSnap.data();
      if (data.status === 'BLOCKED') return res.status(403).json({ error: 'conversation_blocked' });
      return res.json({ matchId, unlocked: true });
    }

    // Permission check
    if (me.gender !== 'FEMALE' && !me.is_premium) {
      const purchased = await hasDirectMessagePurchase(me.id, targetUserId);
      if (!purchased) {
        return res.status(403).json({ error: 'payment_required', message: "Engagement nécessite Premium ou achat direct." });
      }
    }

    await matchRef.set({
      user_one_id: u1,
      user_two_id: u2,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      last_message_at: new Date().toISOString()
    });

    res.json({ matchId, unlocked: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const reportUser = async (req, res) => {
  const me = req.user;
  const { reportedUserId, reason, details } = req.body;
  if (!reportedUserId || reportedUserId === me.id) return res.status(400).json({ error: 'invalid_target' });

  try {
    await db.collection('reports').add({
      reporter_id: me.id,
      reported_user_id: reportedUserId,
      reason: reason || 'GENERAL',
      details: details || null,
      status: 'PENDING',
      created_at: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const markMessagePlayed = async (req, res) => {
  const { id } = req.params; // For RTDB, this id is the message key
  const matchId = req.body?.matchId || req.query?.matchId;
  const venueChatId = req.body?.venueChatId || req.query?.venueChatId;
  if (!matchId && !venueChatId) return res.status(400).json({ error: 'missing_chat_context' });

  try {
    if (matchId) {
      const matchDoc = await db.collection('matches').doc(String(matchId)).get();
      if (!matchDoc.exists) return res.status(404).json({ error: 'match_not_found' });
      const match = matchDoc.data();
      if (match.user_one_id !== req.user.id && match.user_two_id !== req.user.id) {
        return res.status(403).json({ error: 'unauthorized' });
      }
    }

    if (venueChatId) {
      const chatDoc = await db.collection('venue_chats').doc(String(venueChatId)).get();
      if (!chatDoc.exists) return res.status(404).json({ error: 'chat_not_found' });
      const chat = chatDoc.data();
      if (chat.user_id !== req.user.id && chat.partner_id !== req.user.id) {
        return res.status(403).json({ error: 'unauthorized' });
      }
    }

    const msgRef = rtdb.ref(matchId ? `messages/${matchId}/${id}` : `venue_messages/${venueChatId}/${id}`);
    const snap = await msgRef.once('value');
    if (!snap.exists()) return res.status(404).json({ error: 'message_not_found' });

    const msg = snap.val();
    if (msg.sender_id === req.user.id) return res.status(403).json({ error: 'unauthorized' });

    if (msg.metadata?.is_serenade && !msg.metadata?.played_at) {
      await msgRef.update({ 'metadata/played_at': new Date().toISOString() });
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const createVenueThread = async (req, res) => {
  const me = req.user;
  const { venueId } = req.body;

  try {
    const venueDoc = await db.collection('venues').doc(venueId).get();
    if (!venueDoc.exists) return res.status(404).json({ error: 'venue_not_found' });
    const venue = venueDoc.data();
    if (venue.status && venue.status !== 'APPROVED') return res.status(403).json({ error: 'venue_not_available' });
    if (venue.owner_id === me.id) return res.status(400).json({ error: 'cannot_chat_own_venue' });

    const venueChatId = `vchat_${me.id}_${venueId}`;
    const chatRef = db.collection('venue_chats').doc(venueChatId);
    const chatSnap = await chatRef.get();

    // 1. Si le chat existe déjà, on l'ouvre sans frais
    if (chatSnap.exists) {
      return res.json({ venueChatId, venueName: venue.name });
    }

    // 2. Vérification des droits pour un NOUVEAU chat
    const profileRef = db.collection('profiles').doc(me.id);
    const profileSnap = await profileRef.get();
    const profile = profileSnap.exists ? profileSnap.data() : {};
    const isEligible = !!(me.is_premium || me.is_vip || profile?.is_premium || profile?.is_vip);
    const purchased = await hasDirectMessagePurchase(me.id, venueId);
    const currentRoses = Number(profile?.rose_balance || 0);

    if (!isEligible && !purchased) {
      // Si pas premium, on vérifie s'il a au moins 1 Rose d'Or
      if (currentRoses < 1) {
        return res.status(403).json({
          error: 'payment_required',
          message: 'partner_contact_requires_payment'
        });
      }

      // Débit de 1 Rose d'Or
      const now = new Date().toISOString();
      await db.runTransaction(async (tx) => {
        const existingChat = await tx.get(chatRef);
        if (existingChat.exists) return;

        const freshProfileSnap = await tx.get(profileRef);
        const freshRoseBalance = Number(freshProfileSnap.data()?.rose_balance || 0);
        if (freshRoseBalance < 1) {
          const error = new Error('partner_contact_requires_payment');
          error.code = 'payment_required';
          throw error;
        }

        tx.update(profileRef, {
          rose_balance: FieldValue.increment(-1),
          updated_at: now
        });
        tx.set(chatRef, {
          user_id: me.id,
          venue_id: venueId,
          partner_id: venue.owner_id,
          venue_name: venue.name,
          unlocked_with_rose: true,
          last_message_at: now,
          created_at: now
        });
      });
      return res.json({ venueChatId, venueName: venue.name });
    }

    // 3. Création du canal de discussion
    const now = new Date().toISOString();
    await chatRef.set({
      user_id: me.id,
      venue_id: venueId,
      partner_id: venue.owner_id,
      venue_name: venue.name,
      unlocked_with_purchase: purchased,
      unlocked_with_premium: isEligible,
      last_message_at: now,
      created_at: now
    });

    res.json({ venueChatId, venueName: venue.name });
  } catch (error) {
    if (error?.code === 'payment_required') {
      return res.status(403).json({ error: 'payment_required', message: 'partner_contact_requires_payment' });
    }
    res.status(500).json({ error: error.message });
  }
};

module.exports = { sendMessage, markAsRead, createDirectThread, createVenueThread, reportUser, markMessagePlayed };
