import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChevronLeft, Send, Image as ImageIcon, Video, Lock, ShieldCheck, MoreVertical } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as IAP from 'react-native-iap';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { IAP_EXPO_GO_MESSAGE, isExpoGo } from '../../lib/iapRuntime';
import { supabase } from '../../lib/supabase';
import { uploadArrayBufferToBucket } from '../../lib/storageUpload';
import VideoPlayer from '../../components/VideoPlayer';
import DirectMessagePurchaseModal from '../../components/DirectMessagePurchaseModal';

const ChatScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { currentUser, markMessagesAsRead } = useApp();
  const { userId, matchId: initialMatchId } = route.params;

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [resolvedMediaUrls, setResolvedMediaUrls] = useState<Record<string, string>>({});
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checkingUnlock, setCheckingUnlock] = useState(true);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(initialMatchId || null);

  useEffect(() => {
    if (isExpoGo) return;
    IAP.initConnection().catch(() => {});
    return () => { IAP.endConnection().catch(() => {}); };
  }, []);

  const ensureDirectThread = useCallback(async () => {
    try {
      const response = await apiRequest<{ matchId: string; unlocked: boolean }>('/api/messages/direct-thread', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ targetUserId: userId }),
      });
      if (response?.matchId) {
        setActiveMatchId(response.matchId);
        return response.matchId;
      }
      return null;
    } catch (error: any) {
      if (String(error?.message || '').includes('payment_required')) {
        setIsUnlocked(false);
        return null;
      }
      throw error;
    }
  }, [userId]);

  const checkUnlockStatus = useCallback(async () => {
    try {
      if (!userId) {
        setIsUnlocked(false);
        return;
      }

      // 1. Women always have standard access
      if (currentUser?.gender === 'FEMALE') {
        setIsUnlocked(true);
        if (!activeMatchId) {
          await ensureDirectThread();
        }
        return;
      }

      // 2. Men during 7-day trial have complete access
      if (currentUser?.trial_started_at) {
        const trialEnd = new Date(currentUser.trial_started_at);
        trialEnd.setDate(trialEnd.getDate() + 7);
        if (new Date() < trialEnd) {
          setIsUnlocked(true);
          if (!activeMatchId) {
            await ensureDirectThread();
          }
          return;
        }
      }

      // 3. Premium users have access
      if (currentUser?.isPremium) {
        setIsUnlocked(true);
        if (!activeMatchId) {
          await ensureDirectThread();
        }
        return;
      }

      // 4. Check if match exists
      if (activeMatchId) {
        const { data: match } = await supabase.from('matches').select('id').eq('id', activeMatchId).maybeSingle();
        if (match) {
          setIsUnlocked(true);
          return;
        }
      }

      // 5. Check if interaction purchased
      const { data: purchase } = await supabase.from('purchased_interactions')
        .select('id')
        .eq('user_id', currentUser?.id)
        .eq('target_id', userId)
        .eq('interaction_type', 'DIRECT_MESSAGE')
        .maybeSingle();

      if (purchase) {
        setIsUnlocked(true);
        if (!activeMatchId) {
          await ensureDirectThread();
        }
      } else {
        setIsUnlocked(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingUnlock(false);
    }
  }, [activeMatchId, userId, currentUser, ensureDirectThread]);

  const initiateDirectMessagePurchasePaystack = async () => {
    try {
      setPurchaseLoading(true);
      const init = await apiRequest<{ authorization_url: string; reference: string }>(
        '/api/payments/initialize',
        {
          method: 'POST',
          body: JSON.stringify({
            amount: parseInt(process.env.EXPO_PUBLIC_DIRECT_MESSAGE_AMOUNT || '200'),
            type: 'DIRECT_MESSAGE',
            targetId: userId,
            paymentMethod: 'MOBILE_MONEY',
          }),
          requireAuth: true
        }
      );
      const redirectUrl = Linking.createURL('paystack');
      await WebBrowser.openAuthSessionAsync(init.authorization_url, redirectUrl);
      const verify = await apiRequest<{ status: string }>(
        `/api/payments/verify?reference=${init.reference}`,
        { requireAuth: true }
      );
      if (verify.status === 'active') {
        Alert.alert('Succès', 'Message direct débloqué !');
        const threadId = await ensureDirectThread();
        setIsUnlocked(!!threadId);
        setShowUnlockModal(false);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const initiateDirectMessagePurchaseGoogle = async () => {
    if (isExpoGo) {
      Alert.alert('Achat indisponible', IAP_EXPO_GO_MESSAGE);
      return;
    }
    try {
      setPurchaseLoading(true);
      const purchase: any = await IAP.requestPurchase({ sku: 'direct_message_1' });
      const purchaseItem = Array.isArray(purchase) ? purchase[0] : purchase;
      if (purchaseItem) {
        const verifyPath = Platform.OS === 'ios' ? '/api/payments/apple-verify' : '/api/payments/google-verify';
        await apiRequest(verifyPath, {
          method: 'POST',
          body: JSON.stringify({
            productId: purchaseItem.productId,
            type: 'DIRECT_MESSAGE',
            targetId: userId,
            purchaseToken: purchaseItem.purchaseToken,
            transactionId: purchaseItem.transactionId || purchaseItem.originalTransactionIdentifierIOS,
          }),
          requireAuth: true,
        });
        await IAP.finishTransaction({ purchase: purchaseItem, isConsumable: true });
        Alert.alert('Succès', 'Message direct débloqué !');
        const threadId = await ensureDirectThread();
        setIsUnlocked(!!threadId);
        setShowUnlockModal(false);
      }
    } catch (error: any) {
      if (error?.code !== 'E_USER_CANCELLED') {
        Alert.alert('Erreur Google Play', error?.message || 'Achat non finalisé');
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  const fetchMessages = useCallback(async () => {
    if (!activeMatchId) {
      setMessages([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', activeMatchId)
        .order('created_at', { ascending: true });
      if (!error) {
        setMessages(data || []);
        void markMessagesAsRead(activeMatchId);
      }
    } catch (e) { console.error(e); }
  }, [activeMatchId, markMessagesAsRead]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setTargetUser(data);
    };
    fetchUser();
    fetchMessages();
    checkUnlockStatus();

    if (!activeMatchId) return;
    const channel = supabase.channel(`chat_${activeMatchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${activeMatchId}` }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, activeMatchId, fetchMessages, checkUnlockStatus]);

  useEffect(() => {
    const hydrate = async () => {
      for (const msg of messages) {
        if (msg.media_url && !resolvedMediaUrls[msg.media_url]) {
          const { data } = await supabase.storage.from('chat-media').createSignedUrl(msg.media_url, 3600);
          if (data?.signedUrl) {
            setResolvedMediaUrls(prev => ({ ...prev, [msg.media_url]: data.signedUrl }));
          }
        }
      }
    };
    hydrate();
  }, [messages]);

  const handleSend = async (type = 'TEXT', mediaPath?: string) => {
    if (sending) return;
    try {
      setSending(true);
      let threadId = activeMatchId;
      if (!threadId) {
        threadId = await ensureDirectThread();
      }
      if (!threadId) {
        setShowUnlockModal(true);
        return;
      }

      await apiRequest('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ matchId: threadId, content: inputText.trim(), messageType: type, mediaPath, recipientId: userId })
      });
      setInputText('');
      fetchMessages();
      setIsUnlocked(true);
    } catch (e: any) {
      if (e.message.includes('payment_required')) {
        setShowUnlockModal(true);
      } else {
        Alert.alert('Erreur', e.message);
      }
    } finally {
      setSending(false);
    }
  };

  const pickMedia = async (type: 'IMAGE' | 'VIDEO') => {
    if (!isUnlocked) {
      setShowUnlockModal(true);
      return;
    }
    if (sending || mediaUploading) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission requise', "Autorisez l'accès à votre galerie pour envoyer des médias.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'IMAGE' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    try {
      setMediaUploading(true);
      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = asset.fileName || uri.split('/').pop() || `${Date.now()}`;
      const ext = fileName.includes('.') ? fileName.split('.').pop() : (type === 'IMAGE' ? 'jpg' : 'mp4');
      const mimeType = asset.mimeType || (type === 'IMAGE' ? 'image/jpeg' : 'video/mp4');
      let threadId = activeMatchId;
      if (!threadId) {
        threadId = await ensureDirectThread();
      }
      if (!threadId) {
        setShowUnlockModal(true);
        return;
      }
      const path = `${threadId}/${currentUser?.id}/${Date.now()}.${ext}`;

      await uploadArrayBufferToBucket({ bucket: 'chat-media', path, uri, contentType: mimeType });
      await handleSend(type, path);
    } catch (error: any) {
      Alert.alert('Erreur média', error?.message || "Impossible d'envoyer ce fichier.");
    } finally {
      setMediaUploading(false);
    }
  };

  const formatMessageTime = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const datePart = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    const timePart = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
  };

  const isTargetOnline = (() => {
    const ts = targetUser?.last_active_at;
    if (!ts) return false;
    const delta = Date.now() - new Date(ts).getTime();
    return delta >= 0 && delta < 5 * 60 * 1000;
  })();

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.sender_id === currentUser?.id;
    const mediaUrl = item.media_url ? resolvedMediaUrls[item.media_url] : null;
    const hasText = !!item.content;
    const hasImage = item.message_type === 'IMAGE' && !!mediaUrl;
    const hasVideo = item.message_type === 'VIDEO' && !!mediaUrl;

    return (
      <View style={[styles.messageRow, isMine && styles.myMessageRow]}>
        {!isMine && (
          <Image
            source={{ uri: targetUser?.photos?.[0] || 'https://placehold.co/80x80' }}
            style={styles.senderAvatar}
          />
        )}
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          {hasText ? (
            <Text style={[styles.messageText, isMine && styles.myMessageText]}>{item.content}</Text>
          ) : null}
          {hasImage && (
            <Image source={{ uri: mediaUrl }} style={[styles.imageContent, hasText && styles.mediaAfterText]} />
          )}
          {hasVideo && (
            <VideoPlayer uri={mediaUrl} style={[styles.videoContent, hasText && styles.mediaAfterText]} useNativeControls={true} />
          )}
          <Text style={[styles.messageMeta, isMine && styles.myMessageMeta]}>
            {formatMessageTime(item.created_at)}{isMine ? ` • ${item.is_read ? 'Lu ✓✓' : 'Envoyé'}` : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <ChevronLeft color="#2d2723" size={24} />
        </Pressable>
        <Image source={{ uri: targetUser?.photos?.[0] || 'https://placehold.co/80x80' }} style={styles.headerAvatar} />
        <View style={styles.headerTextWrap}>
          <View style={styles.headerNameRow}>
            <Text style={styles.headerTitle}>{targetUser?.name || 'Chat'}</Text>
            {!!targetUser?.is_verified && (
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={12} color="#fff" />
              </View>
            )}
          </View>
          <Text style={styles.headerSubtitle}>{isTargetOnline ? 'En ligne' : 'Hors ligne'}</Text>
        </View>
        <Pressable style={styles.headerMenuBtn}>
          <MoreVertical size={22} color="#2d2723" />
        </Pressable>
      </View>

      {!!targetUser?.is_verified && (
        <View style={styles.profileCard}>
          <View style={styles.profileCardText}>
            <Text style={styles.profileCardTitle}>Profil vérifié</Text>
            <Text style={styles.profileCardSub}>Conversation sécurisée avec ce membre</Text>
          </View>
          <Pressable style={styles.profileCardBtn}>
            <Text style={styles.profileCardBtnText}>Voir le profil</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListFooterComponent={<View style={styles.securityCard}>
          <Text style={styles.securityTitle}>Vos messages sont protégés</Text>
          <Text style={styles.securitySub}>Yamo veille à votre sécurité et à votre confidentialité.</Text>
        </View>}
      />

      {!isUnlocked && !checkingUnlock ? (
        <View style={styles.unlockPrompt}>
          <View style={styles.lockCircle}>
            <Lock color={COLORS.primary} size={20} />
          </View>
          <View style={styles.unlockPromptTextWrap}>
            <Text style={styles.unlockTitle}>Conversation verrouillée</Text>
            <Text style={styles.unlockSub}>Débloquez ce chat pour envoyer vos messages et médias.</Text>
          </View>
          <Pressable style={styles.unlockBtn} onPress={() => setShowUnlockModal(true)}>
            <Text style={styles.unlockBtnText}>Débloquer</Text>
          </Pressable>
        </View>
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputArea}>
          <Pressable onPress={() => void pickMedia('IMAGE')} style={styles.mediaBtn}>
            <ImageIcon size={22} color="#de6464" />
          </Pressable>
          <Pressable onPress={() => void pickMedia('VIDEO')} style={styles.mediaBtn}>
            <Video size={22} color="#de6464" />
          </Pressable>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isUnlocked ? "Écris un message..." : "Conversation verrouillée"}
            multiline
            editable={isUnlocked}
          />
          <Pressable
            onPress={() => {
              if (!isUnlocked) {
                setShowUnlockModal(true);
                return;
              }
              void handleSend();
            }}
            style={[styles.sendBtn, (sending || mediaUploading) && styles.sendBtnDisabled]}
            disabled={sending || mediaUploading}
          >
            <Send size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <DirectMessagePurchaseModal
        visible={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        onPurchasePaystack={initiateDirectMessagePurchasePaystack}
        onPurchaseGoogle={initiateDirectMessagePurchaseGoogle}
        loading={purchaseLoading}
        userName={targetUser?.name}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6efeb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#f6efeb',
  },
  headerBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#de6464',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#201b18',
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6e655f',
    marginTop: 1,
  },
  headerMenuBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: '#efdfcb',
    borderWidth: 1,
    borderColor: '#ead4bb',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  profileCardText: {
    flex: 1,
  },
  profileCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2d2723',
  },
  profileCardSub: {
    marginTop: 2,
    fontSize: 13,
    color: '#6f655f',
  },
  profileCardBtn: {
    backgroundColor: '#f3d4a8',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  profileCardBtnText: {
    color: '#4e3a2a',
    fontWeight: '700',
    fontSize: 13,
  },
  list: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 14 },
  unlockPrompt: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#f3c8c8',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockPromptTextWrap: {
    flex: 1,
  },
  unlockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#402727',
  },
  unlockSub: {
    fontSize: 12,
    color: '#7a5c5c',
    lineHeight: 16,
  },
  unlockBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  unlockBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  myMessageRow: { justifyContent: 'flex-end' },
  senderAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 22 },
  myBubble: { backgroundColor: '#de6464', borderBottomRightRadius: 8 },
  theirBubble: { backgroundColor: '#efe5dc', borderBottomLeftRadius: 8 },
  messageText: { fontSize: 14, color: '#221d1a', lineHeight: 20 },
  myMessageText: { color: '#fff' },
  messageMeta: {
    marginTop: 6,
    fontSize: 11,
    color: '#877e78',
    textAlign: 'right',
  },
  myMessageMeta: {
    color: '#ffe3e3',
  },
  imageContent: { width: 200, height: 200, borderRadius: 12, marginBottom: 4 },
  videoContent: { width: 200, height: 200, borderRadius: 12, marginBottom: 4 },
  mediaAfterText: { marginTop: 8 },
  securityCard: {
    marginTop: 4,
    backgroundColor: '#dfe8e1',
    borderWidth: 1,
    borderColor: '#cad8ce',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  securityTitle: {
    fontWeight: '800',
    color: '#1f3328',
    fontSize: 15,
  },
  securitySub: {
    marginTop: 2,
    color: '#406150',
    fontSize: 13,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#f6efeb',
    borderTopWidth: 1,
    borderTopColor: '#e7dbd2',
    gap: 8,
  },
  mediaBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9ece8',
    borderWidth: 1,
    borderColor: '#efcec8',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5efe9',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e7d8cd',
    paddingHorizontal: 16,
    paddingVertical: 9,
    maxHeight: 100,
    color: '#2a2420',
  },
  sendBtn: {
    backgroundColor: '#de6464',
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
});

export default ChatScreen;
