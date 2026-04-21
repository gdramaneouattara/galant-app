import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { ChevronLeft, Crown, Film, ImagePlus, Send, ShieldAlert, ShieldBan } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import { useApp } from '../../state/AppContext';
import { COLORS } from '../../data/mock';
import { supabase } from '../../lib/supabase';
import { apiRequest } from '../../lib/api';
import { uploadArrayBufferToBucket } from '../../lib/storageUpload';

type ChatRoute = RouteProp<RootStackParamList, 'Chat'>;

type SendMessageResponse = {
  message: {
    id: string;
    match_id: string;
    sender_id: string;
    content: string;
    message_type?: 'TEXT' | 'IMAGE' | 'VIDEO';
    media_url?: string | null;
    created_at: string;
    is_read: boolean;
    read_at?: string | null;
  };
};

const getMessageType = (message: { message_type?: 'TEXT' | 'IMAGE' | 'VIDEO'; type?: 'TEXT' | 'IMAGE' | 'VIDEO' }) =>
  message.message_type ?? message.type ?? 'TEXT';

const ChatScreen: React.FC = () => {
  const { params } = useRoute<ChatRoute>();
  const navigation = useNavigation();
  const { currentUser, users, messages, addMessage } = useApp();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [signedMediaUrls, setSignedMediaUrls] = useState<Record<string, string>>({});

  if (!currentUser) {
    return null;
  }

  const matchedUser = useMemo(() => users.find((u) => u.id === params.userId), [params.userId, users]);
  const matchId = params.matchId;

  const thread = useMemo(
    () => messages.filter((m) => m.match_id === matchId),
    [messages, matchId]
  );

  useFocusEffect(
    React.useCallback(() => {
      const markRead = async () => {
        try {
          await apiRequest('/api/messages/read', {
            method: 'POST',
            requireAuth: true,
            body: JSON.stringify({ matchId }),
          });
        } catch (_error) {
          // Ignore read receipt sync failures on focus; the thread remains usable.
        }
      };
      void markRead();
      return () => {};
    }, [matchId, currentUser.id])
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateSignedUrls = async () => {
      const mediaMessages = thread.filter((msg) => (
        (getMessageType(msg) === 'IMAGE' || getMessageType(msg) === 'VIDEO') && !!msg.media_url
      ));
      for (const msg of mediaMessages) {
        const mediaPath = msg.media_url as string;
        if (signedMediaUrls[mediaPath]) continue;

        const { data, error } = await supabase.storage
          .from('chat-media')
          .createSignedUrl(mediaPath, 3600);

        if (cancelled) return;
        if (!error && data?.signedUrl) {
          setSignedMediaUrls((prev) => ({ ...prev, [mediaPath]: data.signedUrl }));
        }
      }
    };

    void hydrateSignedUrls();

    return () => {
      cancelled = true;
    };
  }, [thread, signedMediaUrls]);

  const sendTextMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    try {
      setSending(true);
      const response = await apiRequest<SendMessageResponse>('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          matchId,
          content: text,
          messageType: 'TEXT',
        }),
      });
      if (response?.message) {
        addMessage(response.message);
        setInputText('');
      }
    } catch (error: any) {
      Alert.alert('Envoi impossible', error?.message || 'Le message n’a pas été envoyé.');
    } finally {
      setSending(false);
    }
  }, [inputText, sending, matchId, addMessage]);

  const sendMediaMessage = useCallback(async (type: 'IMAGE' | 'VIDEO') => {
    if (uploadingMedia) return;
    if (!currentUser.isPremium) {
      navigation.navigate('Premium' as never);
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission refusée', "Autorisez l'accès à la galerie pour envoyer une photo.");
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'IMAGE' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (picked.canceled || !picked.assets?.[0]?.uri) return;

      setUploadingMedia(true);
      const asset = picked.assets[0];
      const uri = asset.uri;
      const extension = (uri.split('.').pop() || (type === 'VIDEO' ? 'mp4' : 'jpg')).toLowerCase();
      const contentType = asset.mimeType
        || (type === 'VIDEO'
          ? (extension === 'mov' ? 'video/quicktime' : 'video/mp4')
          : (extension === 'png' ? 'image/png' : 'image/jpeg'));
      const filePath = `${matchId}/${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;

      const uploadResult = await uploadArrayBufferToBucket({
        bucket: 'chat-media',
        path: filePath,
        uri,
        contentType,
        upsert: false,
      });

      const sent = await apiRequest<SendMessageResponse>('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          matchId,
          content: type === 'VIDEO' ? 'Video' : 'Photo',
          messageType: type,
          mediaPath: filePath,
          mediaSizeBytes: uploadResult.bytes,
          mediaMimeType: contentType,
        }),
      });

      if (sent?.message) {
        addMessage(sent.message);
      }
    } catch (error: any) {
      Alert.alert('Envoi impossible', error?.message || `Impossible d'envoyer le ${type === 'VIDEO' ? 'contenu video' : 'media'}.`);
    } finally {
      setUploadingMedia(false);
    }
  }, [uploadingMedia, currentUser.id, currentUser.isPremium, matchId, addMessage, navigation]);

  const blockUser = async () => {
    if (!matchedUser) return;
    Alert.alert(
      'Bloquer cet utilisateur',
      'Le blocage supprime le match et empêche les futurs messages.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bloquer',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest('/api/moderation/block', {
                method: 'POST',
                requireAuth: true,
                body: JSON.stringify({
                  blockedUserId: matchedUser.id,
                  reason: 'blocked_from_chat',
                }),
              });
              Alert.alert('Utilisateur bloqué', 'Le match a été désactivé.');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Erreur', error?.message || 'Impossible de bloquer cet utilisateur.');
            }
          },
        },
      ]
    );
  };

  const reportUser = async () => {
    if (!matchedUser) return;
    try {
      await apiRequest('/api/moderation/report', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          reportedUserId: matchedUser.id,
          targetType: 'PROFILE',
          category: 'ABUSE',
          description: `Signalement depuis le chat (${matchId}).`,
        }),
      });
      Alert.alert('Signalement envoyé', 'L’équipe de modération analysera ce profil.');
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de signaler cet utilisateur.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <ChevronLeft color={COLORS.ink} size={22} />
        </Pressable>

        {matchedUser ? (
          <View style={styles.headerInfo}>
            <Image source={{ uri: matchedUser.photos[0] }} style={styles.avatar} />
            <View>
              <Text style={styles.name}>{matchedUser.name}</Text>
              <Text style={styles.status}>Conversation sécurisée</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.headerActions}>
          <Pressable style={styles.headerActionButton} onPress={() => void reportUser()}>
            <ShieldAlert color="#b45309" size={17} />
          </Pressable>
          <Pressable style={styles.headerActionButton} onPress={() => void blockUser()}>
            <ShieldBan color="#b91c1c" size={17} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
        {thread.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Démarrez la conversation.</Text>
          </View>
        ) : (
          thread.map((msg) => {
            const mine = msg.sender_id === currentUser.id;
            const isImage = getMessageType(msg) === 'IMAGE' && !!msg.media_url;
            const isVideo = getMessageType(msg) === 'VIDEO' && !!msg.media_url;
            const signedUrl = msg.media_url ? signedMediaUrls[msg.media_url] : null;

            return (
              <View key={msg.id} style={[styles.bubble, mine ? styles.bubbleRight : styles.bubbleLeft]}>
                {isImage && signedUrl ? (
                  <Image source={{ uri: signedUrl }} style={styles.messageImage} />
                ) : null}
                {isVideo && signedUrl ? (
                  <Pressable style={styles.videoCard} onPress={() => void Linking.openURL(signedUrl)}>
                    <Film color={mine ? '#fff' : COLORS.primary} size={20} />
                    <Text style={[styles.videoLabel, mine ? styles.bubbleRightText : styles.bubbleLeftText]}>
                      Ouvrir la video
                    </Text>
                  </Pressable>
                ) : null}
                {!!msg.content ? (
                  <Text style={[styles.bubbleText, mine ? styles.bubbleRightText : styles.bubbleLeftText]}>
                    {msg.content}
                  </Text>
                ) : null}
                {mine ? <Text style={styles.readReceipt}>{msg.is_read ? 'Lu' : 'Envoye'}</Text> : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })}>
        {!currentUser.isPremium ? (
          <Pressable style={styles.premiumCard} onPress={() => navigation.navigate('Premium' as never)}>
            <View style={styles.premiumIcon}>
              <Crown color={COLORS.primary} size={22} />
            </View>
            <View style={styles.premiumText}>
              <Text style={styles.premiumTitle}>Medias premium</Text>
              <Text style={styles.premiumSubtitle}>Le texte est disponible pour tous les matchs. Les photos et videos restent reservees au Premium.</Text>
            </View>
          </Pressable>
        ) : null}
        <View style={styles.inputRow}>
          <Pressable style={styles.mediaButton} onPress={() => void sendMediaMessage('IMAGE')} disabled={uploadingMedia || sending}>
            <ImagePlus color={COLORS.primary} size={18} />
          </Pressable>
          <Pressable style={styles.mediaButton} onPress={() => void sendMediaMessage('VIDEO')} disabled={uploadingMedia || sending}>
            <Film color={COLORS.primary} size={18} />
          </Pressable>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message (texte + emojis)"
            style={styles.input}
            onSubmitEditing={() => void sendTextMessage()}
            editable={!sending && !uploadingMedia}
          />
          <Pressable onPress={() => void sendTextMessage()} style={styles.sendButton} disabled={sending || uploadingMedia}>
            <Send color="#fff" size={18} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
    gap: 8,
  },
  back: {
    padding: 6,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  name: {
    fontWeight: '700',
    color: COLORS.ink,
  },
  status: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  messages: {
    padding: 16,
    gap: 10,
  },
  emptyState: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.muted,
  },
  bubble: {
    maxWidth: '82%',
    padding: 10,
    borderRadius: 16,
    gap: 6,
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bubbleRight: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
  },
  bubbleText: {
    fontSize: 14,
  },
  readReceipt: {
    alignSelf: 'flex-end',
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.78)',
  },
  bubbleLeftText: {
    color: COLORS.ink,
  },
  bubbleRightText: {
    color: '#fff',
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  videoCard: {
    minWidth: 170,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  videoLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
    gap: 8,
  },
  mediaButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe3ef',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#ffe4e6',
    margin: 12,
    padding: 12,
    borderRadius: 16,
    gap: 12,
  },
  premiumIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumText: {
    flex: 1,
    gap: 2,
  },
  premiumTitle: {
    fontWeight: '800',
    color: COLORS.ink,
  },
  premiumSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
  },
});

export default ChatScreen;
