import React, { useEffect, useState, useRef, useMemo } from 'react';
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
import { ChevronLeft, Send, Image as ImageIcon, Video, Play, Crown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface CommunityMessage {
  id: string;
  content: string;
  message_type: 'TEXT' | 'IMAGE' | 'VIDEO';
  media_url?: string;
  created_at: string;
  sender_id: string;
  profiles: {
    name: string;
    photos: string[];
  };
}

const CommunityChatScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { currentUser } = useApp();
  const { communityId, communityName } = route.params;

  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = async () => {
    try {
      const data = await apiRequest<CommunityMessage[]>(`/api/communities/${communityId}/messages`, {
        requireAuth: true,
      });
      setMessages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Abonnement temps réel
    const channel = supabase
      .channel(`community_${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_messages',
          filter: `community_id=eq.${communityId}`,
        },
        (payload) => {
          // On recharge pour avoir les infos du profil jointes
          void fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId]);

  const handleSend = async (type: 'TEXT' | 'IMAGE' | 'VIDEO' = 'TEXT', mediaUrl?: string) => {
    if (sending) return;
    if (type === 'TEXT' && !inputText.trim()) return;

    // Vérification Premium pour les médias
    if (type !== 'TEXT' && !currentUser?.isPremium) {
      Alert.alert('Premium requis', 'Le partage de photos et vidéos est réservé aux membres Premium.');
      return;
    }

    setSending(true);
    try {
      await apiRequest(`/api/communities/${communityId}/messages`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          content: type === 'TEXT' ? inputText.trim() : '',
          message_type: type,
          media_url: mediaUrl,
        }),
      });
      setInputText('');
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || "Impossible d'envoyer le message.");
    } finally {
      setSending(false);
    }
  };

  const pickMedia = async (type: 'IMAGE' | 'VIDEO') => {
    if (!currentUser?.isPremium) {
      Alert.alert('Premium requis', 'Passez Premium pour partager des médias dans la communauté.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'IMAGE' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.7,
      videoMaxDuration: 15,
    });

    if (!result.canceled && result.assets[0].uri) {
      const uri = result.assets[0].uri;
      // Logique d'upload vers Supabase Storage (bucket community-media)
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const fileExt = uri.split('.').pop();
        const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
        const filePath = `${communityId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('community-media')
          .upload(filePath, blob);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('community-media')
          .getPublicUrl(filePath);

        void handleSend(type, publicUrl);
      } catch (e) {
        Alert.alert('Erreur Upload', "Impossible d'envoyer le média.");
      }
    }
  };

  const renderMessage = ({ item }: { item: CommunityMessage }) => {
    const isMine = item.sender_id === currentUser?.id;

    return (
      <View style={[styles.messageRow, isMine && styles.myMessageRow]}>
        {!isMine && (
          <Image source={{ uri: item.profiles.photos[0] }} style={styles.miniAvatar} />
        )}
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          {!isMine && <Text style={styles.senderName}>{item.profiles.name}</Text>}

          {item.message_type === 'TEXT' && (
            <Text style={[styles.messageText, isMine && styles.myMessageText]}>{item.content}</Text>
          )}

          {item.message_type === 'IMAGE' && (
            <Image source={{ uri: item.media_url }} style={styles.mediaContent} resizeMode="cover" />
          )}

          {item.message_type === 'VIDEO' && (
            <View style={styles.videoContainer}>
              <ExpoVideo
                source={{ uri: item.media_url! }}
                style={styles.mediaContent}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                isLooping
              />
            </View>
          )}

          <Text style={styles.time}>
            {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={COLORS.ink} size={24} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.communityName}>{communityName}</Text>
          <Text style={styles.activeStatus}>Espace de discussion</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Soyez le premier à poster !</Text>
            </View>
          ) : null
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputArea}>
          <View style={styles.mediaButtons}>
            <Pressable onPress={() => pickMedia('IMAGE')} style={styles.mediaBtn}>
              <ImageIcon size={20} color={currentUser?.isPremium ? COLORS.primary : '#cbd5e1'} />
            </Pressable>
            <Pressable onPress={() => pickMedia('VIDEO')} style={styles.mediaBtn}>
              <Video size={20} color={currentUser?.isPremium ? COLORS.primary : '#cbd5e1'} />
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Écris un message..."
            placeholderTextColor="#94a3b8"
            multiline
          />

          <Pressable
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={() => void handleSend()}
            disabled={sending || !inputText.trim()}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
          </Pressable>
        </View>
        {!currentUser?.isPremium && (
          <View style={styles.premiumHint}>
            <Crown size={12} color="#f59e0b" />
            <Text style={styles.premiumHintText}>Premium requis pour envoyer des photos/vidéos</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { marginLeft: 8 },
  communityName: { fontSize: 18, fontWeight: '800', color: COLORS.ink },
  activeStatus: { fontSize: 12, color: '#22c55e', fontWeight: '600' },
  list: { padding: 16, gap: 16 },
  messageRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  myMessageRow: { justifyContent: 'flex-end' },
  miniAvatar: { width: 32, height: 32, borderRadius: 10, alignSelf: 'flex-end' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 20 },
  myBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  senderName: { fontSize: 11, fontWeight: '800', color: COLORS.muted, marginBottom: 4 },
  messageText: { fontSize: 15, color: COLORS.ink, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  mediaContent: { width: 240, height: 240, borderRadius: 12, marginTop: 4 },
  videoContainer: { width: 240, height: 240, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' },
  time: { fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 4, alignSelf: 'flex-end' },
  empty: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { color: COLORS.muted, fontWeight: '600' },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 10 },
  mediaButtons: { flexDirection: 'row', gap: 8 },
  mediaBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 15, color: COLORS.ink, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#cbd5e1' },
  premiumHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6, backgroundColor: '#fffbeb' },
  premiumHintText: { fontSize: 11, color: '#b45309', fontWeight: '700' },
});

export default CommunityChatScreen;
