import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
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
import { ChevronLeft, Crown, ImagePlus, Send, ShieldAlert, ShieldBan } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import { useApp } from '../../state/AppContext';
import { COLORS } from '../../data/mock';
import { supabase } from '../../lib/supabase';
import { apiRequest } from '../../lib/api';

type ChatRoute = RouteProp<RootStackParamList, 'Chat'>;

type SendMessageResponse = {
  message: {
    id: string;
    match_id: string;
    sender_id: string;
    content: string;
    message_type?: 'TEXT' | 'IMAGE';
    media_url?: string | null;
    created_at: string;
    is_read: boolean;
  };
};

const ChatScreen: React.FC = () => {
  const { params } = useRoute<ChatRoute>();
  const navigation = useNavigation();
  const { currentUser, users, messages, addMessage } = useApp();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('match_id', matchId)
          .neq('sender_id', currentUser.id);
      };
      void markRead();
      return () => {};
    }, [matchId, currentUser.id])
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateSignedUrls = async () => {
      const imageMessages = thread.filter((msg) => msg.message_type === 'IMAGE' && !!msg.media_url);
      for (const msg of imageMessages) {
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

  const sendImageMessage = useCallback(async () => {
    if (uploadingImage) return;
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (picked.canceled || !picked.assets?.[0]?.uri) return;

      setUploadingImage(true);
      const uri = picked.assets[0].uri;
      const extension = (uri.split('.').pop() || 'jpg').toLowerCase();
      const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';
      const filePath = `${matchId}/${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage.from('chat-media').upload(
        filePath,
        blob,
        { upsert: false, contentType }
      );

      if (uploadError) {
        Alert.alert('Upload impossible', uploadError.message || 'Impossible de téléverser la photo.');
        return;
      }

      const sent = await apiRequest<SendMessageResponse>('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          matchId,
          content: '📷 Photo',
          messageType: 'IMAGE',
          mediaPath: filePath,
          mediaSizeBytes: blob.size,
        }),
      });

      if (sent?.message) {
        addMessage(sent.message);
      }
    } catch (error: any) {
      Alert.alert('Envoi impossible', error?.message || 'Impossible d’envoyer la photo.');
    } finally {
      setUploadingImage(false);
    }
  }, [uploadingImage, currentUser.id, currentUser.isPremium, matchId, addMessage, navigation]);

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
            const isImage = msg.message_type === 'IMAGE' && !!msg.media_url;
            const signedUrl = msg.media_url ? signedMediaUrls[msg.media_url] : null;

            return (
              <View key={msg.id} style={[styles.bubble, mine ? styles.bubbleRight : styles.bubbleLeft]}>
                {isImage && signedUrl ? (
                  <Image source={{ uri: signedUrl }} style={styles.messageImage} />
                ) : null}
                {!!msg.content ? (
                  <Text style={[styles.bubbleText, mine ? styles.bubbleRightText : styles.bubbleLeftText]}>
                    {msg.content}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })}>
        {currentUser.isPremium ? (
          <View style={styles.inputRow}>
            <Pressable style={styles.mediaButton} onPress={() => void sendImageMessage()} disabled={uploadingImage || sending}>
              <ImagePlus color={COLORS.primary} size={18} />
            </Pressable>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message (texte + emojis)"
              style={styles.input}
              onSubmitEditing={() => void sendTextMessage()}
              editable={!sending}
            />
            <Pressable onPress={() => void sendTextMessage()} style={styles.sendButton} disabled={sending || uploadingImage}>
              <Send color="#fff" size={18} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.premiumCard} onPress={() => navigation.navigate('Premium' as never)}>
            <View style={styles.premiumIcon}>
              <Crown color={COLORS.primary} size={22} />
            </View>
            <View style={styles.premiumText}>
              <Text style={styles.premiumTitle}>Messagerie premium</Text>
              <Text style={styles.premiumSubtitle}>Abonnement Premium requis pour répondre et envoyer des photos.</Text>
            </View>
          </Pressable>
        )}
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
