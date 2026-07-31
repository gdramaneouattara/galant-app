import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { rtdb, db, COLLECTIONS, fbStorage } from '../../lib/firebase';
import { PresenceInfo, subscribeToUserPresence } from '../../lib/presence';
import { uploadArrayBufferToBucket, getPublicUrl } from '../../lib/storageUpload';
import { optimizedPhotoUrl } from '../../lib/mediaVariants';

// Components
import ChatHeader from './components/ChatHeader';
import ChatInput from './components/ChatInput';
import ChatMessageItem from './components/ChatMessageItem';

interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  message_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE';
  media_url?: string | null;
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

const CHAT_VIDEO_MAX_DURATION_MS = 31 * 1000;
const VIDEO_UPLOAD_MAX_BYTES = 30 * 1024 * 1024;
const VOICE_MAX_DURATION_SECONDS = 30;
const VOICE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

const ChatScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { currentUser, markMessagesAsRead, colors, t, language } = useApp();
  const { userId, matchId: initialMatchId, venueChatId: initialVenueChatId, venueName, venuePhoto } = route.params;

  const [activeMatchId, setActiveMatchId] = useState<string | undefined>(initialMatchId);
  const [activeVenueChatId, setActiveVenueChatId] = useState<string | undefined>(initialVenueChatId);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [targetPresence, setTargetPresence] = useState<PresenceInfo | null>(null);
  const [voiceRecording, setVoiceRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (voiceRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingDuration(0);
    }

    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [voiceRecording]);

  useEffect(() => {
    if (voiceRecording && recordingDuration >= VOICE_MAX_DURATION_SECONDS) {
      void stopVoiceRecording(true);
    }
  }, [voiceRecording, recordingDuration]);

  const formatRecordingDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!userId || activeVenueChatId) {
      setTargetPresence(null);
      return;
    }

    return subscribeToUserPresence(userId, setTargetPresence);
  }, [userId, activeVenueChatId]);

  useEffect(() => {
    // 1. Fetch Target User Profile
    const fetchUser = async () => {
      if (activeVenueChatId) {
        if (currentUser?.is_partner) {
          const doc = await db.collection(COLLECTIONS.PROFILES).doc(userId).get();
          if (doc.exists()) setTargetUser({ id: doc.id, ...doc.data() });
        } else {
          setTargetUser({ name: venueName, photos: [venuePhoto], is_venue: true });
        }
        return;
      }
      if (!userId) return;
      const doc = await db.collection(COLLECTIONS.PROFILES).doc(userId).get();
      if (doc.exists()) setTargetUser({ id: doc.id, ...doc.data() });
    };
    fetchUser();

    // 2. Realtime Messages Subscription
    const chatPath = activeMatchId ? `messages/${activeMatchId}` : `venue_messages/${activeVenueChatId}`;
    if (!chatPath) return;

    const ref = rtdb.ref(chatPath);
    const listener = ref.on('value', (snapshot) => {
      if (snapshot.exists()) {
        const msgs = Object.entries(snapshot.val()).map(([id, data]: any) => ({
          id,
          ...data
        }));
        setMessages(msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      } else {
        setMessages([]);
      }
      setLoading(false);
    });

    if (activeMatchId) void markMessagesAsRead(activeMatchId);

    return () => ref.off('value', listener);
  }, [userId, activeMatchId, activeVenueChatId]);

  const handleSend = async () => {
    if (sending || !inputText.trim()) return;
    try {
      setSending(true);
      await apiRequest('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          matchId: activeMatchId,
          venueChatId: activeVenueChatId,
          content: inputText.trim(),
          messageType: 'TEXT',
          recipientId: userId
        })
      });
      setInputText('');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSending(false);
    }
  };

  const handleAttachMedia = async (type: 'IMAGE' | 'VIDEO') => {
    if (!currentUser?.is_premium) {
      Alert.alert(
        t('premium_join'),
        "Le partage de photos et vidéos est un privilège réservé aux membres Premium. ✨",
        [
          { text: t('maybe_later'), style: 'cancel' },
          { text: t('become_premium'), onPress: () => navigation.navigate('Premium') }
        ]
      );
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: type === 'IMAGE' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: type === 'VIDEO' ? 30 : undefined,
      videoExportPreset: type === 'VIDEO' ? ImagePicker.VideoExportPreset.H264_960x540 : undefined,
      videoQuality: type === 'VIDEO' ? ImagePicker.UIImagePickerControllerQualityType.Medium : undefined,
    };

    const result = await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (type === 'VIDEO') {
      if (typeof asset.duration === 'number' && asset.duration > CHAT_VIDEO_MAX_DURATION_MS) {
        Alert.alert('Video trop longue', "Les videos chat sont limitees a 30 secondes.");
        return;
      }
      if (typeof asset.fileSize === 'number' && asset.fileSize > VIDEO_UPLOAD_MAX_BYTES) {
        Alert.alert('Video trop lourde', "La video doit peser moins de 30 Mo avant envoi.");
        return;
      }
    }

    try {
      setUploading(true);
      let mediaUrl = '';
      let metadata: Record<string, any> = {};

      if (type === 'VIDEO') {
        const formData = new FormData();
        formData.append('type', 'CHAT');
        formData.append('video', {
          uri: asset.uri,
          name: 'chat.mp4',
          type: asset.mimeType || 'video/mp4',
        } as any);

        const res = await apiRequest<{ mediaUrl: string; thumbnailUrl?: string }>('/api/media/upload-video', {
          method: 'POST',
          requireAuth: true,
          body: formData,
        });
        mediaUrl = await fbStorage.ref(`chat-media/${res.mediaUrl}`).getDownloadURL();
        if (res.thumbnailUrl) {
          metadata.thumbnail_url = await fbStorage.ref(`chat-media/${res.thumbnailUrl}`).getDownloadURL();
        }
      } else {
        const bucketPath = `chats/${activeMatchId || activeVenueChatId}/${Date.now()}`;
        await uploadArrayBufferToBucket({
          bucket: COLLECTIONS.MATCHES,
          path: bucketPath,
          uri: asset.uri,
          contentType: 'image/webp'
        });
        mediaUrl = await getPublicUrl(COLLECTIONS.MATCHES, bucketPath);
      }

      await apiRequest('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          matchId: activeMatchId,
          venueChatId: activeVenueChatId,
          messageType: type,
          mediaPath: mediaUrl,
          metadata,
          recipientId: userId
        })
      });

    } catch (e: any) {
      Alert.alert('Erreur Upload', e.message);
    } finally {
      setUploading(false);
    }
  };

  const startVoiceRecording = async () => {
    if (!currentUser?.is_premium) {
      Alert.alert(
        t('premium_join'),
        "La sérénade vocale est réservée aux membres Premium.",
        [
          { text: t('maybe_later'), style: 'cancel' },
          { text: t('become_premium'), onPress: () => navigation.navigate('Premium') }
        ]
      );
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Micro requis', "Autorisez l'accès au micro pour envoyer une sérénade vocale.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setVoiceRecording(recording);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || "Impossible de démarrer l'enregistrement.");
    }
  };

  const stopVoiceRecording = async (shouldSend: boolean) => {
    const recording = voiceRecording;
    if (!recording) return;

    setVoiceRecording(null);
    try {
      await recording.stopAndUnloadAsync();
    } catch {}
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    const uri = recording.getURI();
    if (!shouldSend || !uri) return;

    try {
      setUploading(true);
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && typeof info.size === 'number' && info.size > VOICE_UPLOAD_MAX_BYTES) {
        Alert.alert('Sérénade trop lourde', 'La sérénade vocale est limitée à 2 Mo. Essayez un message plus court.');
        return;
      }

      const ref = fbStorage.ref(`chats/${activeMatchId || activeVenueChatId}/${Date.now()}_serenade.m4a`);
      await ref.putFile(uri, { contentType: 'audio/m4a' });
      const mediaUrl = await ref.getDownloadURL();

      await apiRequest('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          matchId: activeMatchId,
          venueChatId: activeVenueChatId,
          messageType: 'VOICE',
          mediaPath: mediaUrl,
          metadata: {
            is_serenade: true,
            duration_seconds: Math.min(recordingDuration, VOICE_MAX_DURATION_SECONDS),
          },
          recipientId: userId
        })
      });
    } catch (e: any) {
      Alert.alert('Erreur Upload', e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleToggleVoice = async () => {
    if (voiceRecording) {
      await stopVoiceRecording(true);
    } else {
      await startVoiceRecording();
    }
  };

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isMine = item.sender_id === currentUser?.id;
    return (
      <ChatMessageItem
        item={item}
        matchId={activeMatchId}
        venueChatId={activeVenueChatId}
        isMine={isMine}
        avatarUri={optimizedPhotoUrl(targetUser?.photos?.[0], targetUser?.photo_variants, 'thumb') || 'https://placehold.co/80x80'}
        mediaUrl={item.media_url || null}
        displayTime={item.created_at}
        t={t}
        is_premium={!!currentUser?.is_premium}
        language={language}
      />
    );
  }, [currentUser, targetUser, t, language, activeMatchId, activeVenueChatId]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ChatHeader
        title={targetUser?.name || 'Chat'}
        subtitle={targetPresence ? (targetPresence.is_online ? t('online') : t('offline')) : undefined}
        isOnline={!!targetPresence?.is_online}
        onBack={() => navigation.goBack()}
        onOpenSafety={() => {}}
        colors={colors}
      />

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        inverted={false}
        ListHeaderComponent={
          <View style={styles.privacyNotice}>
            <Text style={styles.privacyNoticeText}>
              🛡️ Par mesure de confidentialité, les médias partagés sont effacés après 15 jours.
            </Text>
          </View>
        }
      />

      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        onSend={handleSend}
        onAttachMedia={handleAttachMedia}
        onToggleVoice={handleToggleVoice}
        onCancelVoice={() => void stopVoiceRecording(false)}
        sending={sending}
        uploading={uploading}
        isRecording={!!voiceRecording}
        recordingDuration={formatRecordingDuration(recordingDuration)}
        t={t}
        colors={colors}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  listContent: { padding: 16, gap: 16 },
  privacyNotice: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 16, marginBottom: 8, borderColor: '#e2e8f0', borderWidth: 1 },
  privacyNoticeText: { fontSize: 11, color: '#64748b', textAlign: 'center', fontWeight: '600' },
});

export default ChatScreen;
