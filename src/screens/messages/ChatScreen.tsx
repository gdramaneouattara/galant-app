import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChevronLeft, Send, Image as ImageIcon, Video, ShieldAlert, ShieldBan, Lock } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as IAP from 'react-native-iap';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { uploadArrayBufferToBucket } from '../../lib/storageUpload';
import VideoPlayer from '../../components/VideoPlayer';
import DirectMessagePurchaseModal from '../../components/DirectMessagePurchaseModal';

const ChatScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { currentUser, markMessagesAsRead } = useApp();
  const { userId, matchId } = route.params;

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [resolvedMediaUrls, setResolvedMediaUrls] = useState<Record<string, string>>({});
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checkingUnlock, setCheckingUnlock] = useState(true);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  useEffect(() => {
    IAP.initConnection().catch(() => {});
    return () => { IAP.endConnection().catch(() => {}); };
  }, []);

  const checkUnlockStatus = useCallback(async () => {
    try {
      // 1. Women always have standard access
      if (currentUser?.gender === 'FEMALE') {
        setIsUnlocked(true);
        return;
      }

      // 2. Men during 7-day trial have complete access
      if (currentUser?.trial_started_at) {
        const trialEnd = new Date(currentUser.trial_started_at);
        trialEnd.setDate(trialEnd.getDate() + 7);
        if (new Date() < trialEnd) {
          setIsUnlocked(true);
          return;
        }
      }

      // 3. Premium users have access
      if (currentUser?.isPremium) {
        setIsUnlocked(true);
        return;
      }

      // 4. Check if match exists
      const { data: match } = await supabase.from('matches').select('id').eq('id', matchId).maybeSingle();
      if (match) {
        setIsUnlocked(true);
        return;
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
      } else {
        setIsUnlocked(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingUnlock(false);
    }
  }, [matchId, userId, currentUser]);

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
        setIsUnlocked(true);
        setShowUnlockModal(false);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const initiateDirectMessagePurchaseGoogle = async () => {
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
        setIsUnlocked(true);
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
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false });
      if (!error) {
        setMessages(data || []);
        void markMessagesAsRead(matchId);
      }
    } catch (e) { console.error(e); }
  }, [matchId]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setTargetUser(data);
    };
    fetchUser();
    fetchMessages();
    checkUnlockStatus();

    const channel = supabase.channel(`chat_${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, matchId, fetchMessages]);

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
      await apiRequest('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ matchId, content: inputText.trim(), messageType: type, mediaPath, recipientId: userId })
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'IMAGE' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      const uri = result.assets[0].uri;
      const fileExt = uri.split('.').pop();
      const path = `${currentUser?.id}/${Date.now()}.${fileExt}`;
      await uploadArrayBufferToBucket({ bucket: 'chat-media', path, uri, contentType: type === 'IMAGE' ? 'image/jpeg' : 'video/mp4' });
      handleSend(type, path);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.sender_id === currentUser?.id;
    const mediaUrl = item.media_url ? resolvedMediaUrls[item.media_url] : null;

    return (
      <View style={[styles.messageRow, isMine && styles.myMessageRow]}>
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          {item.message_type === 'IMAGE' && mediaUrl && (
            <Image source={{ uri: mediaUrl }} style={styles.imageContent} />
          )}
          {item.message_type === 'VIDEO' && mediaUrl && (
            <VideoPlayer uri={mediaUrl} style={styles.videoContent} useNativeControls={true} />
          )}
          {item.content ? (
            <Text style={[styles.messageText, isMine && styles.myMessageText]}>{item.content}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><ChevronLeft color={COLORS.ink} /></Pressable>
        <Text style={styles.headerTitle}>{targetUser?.name || 'Chat'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={styles.list}
        ListFooterComponent={!isUnlocked && !checkingUnlock ? (
          <View style={styles.unlockPrompt}>
            <View style={styles.lockCircle}>
              <Lock color={COLORS.primary} size={24} />
            </View>
            <Text style={styles.unlockTitle}>Pas encore de match</Text>
            <Text style={styles.unlockSub}>Vous ne pouvez pas encore discuter gratuitement avec {targetUser?.name}.</Text>
            <Pressable style={styles.unlockBtn} onPress={() => setShowUnlockModal(true)}>
              <Text style={styles.unlockBtnText}>Débloquer pour 200 F CFA</Text>
            </Pressable>
          </View>
        ) : null}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputArea}>
          <Pressable onPress={() => pickMedia('IMAGE')} style={styles.mediaBtn} disabled={!isUnlocked}><ImageIcon size={20} color={isUnlocked ? COLORS.muted : '#cbd5e1'} /></Pressable>
          <Pressable onPress={() => pickMedia('VIDEO')} style={styles.mediaBtn} disabled={!isUnlocked}><Video size={20} color={isUnlocked ? COLORS.muted : '#cbd5e1'} /></Pressable>
          <TextInput
            style={[styles.input, !isUnlocked && { backgroundColor: '#f8fafc', color: '#94a3b8' }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isUnlocked ? "Écris un message..." : "Conversation verrouillée"}
            multiline
            editable={isUnlocked}
          />
          <Pressable onPress={() => handleSend()} style={[styles.sendBtn, !isUnlocked && { backgroundColor: '#cbd5e1' }]} disabled={(!inputText.trim() && !sending) || !isUnlocked}>
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
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.ink },
  list: { padding: 16 },
  unlockPrompt: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  lockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  unlockTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
  },
  unlockSub: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  unlockBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  unlockBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  messageRow: { flexDirection: 'row', marginBottom: 12 },
  myMessageRow: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 20 },
  myBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  messageText: { fontSize: 15, color: COLORS.ink },
  myMessageText: { color: '#fff' },
  imageContent: { width: 200, height: 200, borderRadius: 12, marginBottom: 4 },
  videoContent: { width: 200, height: 200, borderRadius: 12, marginBottom: 4 },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 8 },
  mediaBtn: { padding: 8 },
  input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100 },
  sendBtn: { backgroundColor: COLORS.primary, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }
});

export default ChatScreen;
