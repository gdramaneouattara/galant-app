import React, { memo, useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Music, Play, Languages, MapPin, Calendar, Trash2 } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { apiRequest } from '../../../lib/api';
import { COLORS } from '../../../data/mock';

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

interface ChatMessageItemProps {
  item: ChatMessage;
  isMine: boolean;
  avatarUri: string;
  mediaUrl: string | null;
  displayTime: string;
  t: (key: any, params?: any) => string;
  is_premium: boolean;
  language: string;
}

const ChatMessageItem = memo<ChatMessageItemProps>(({
  item, isMine, avatarUri, mediaUrl, displayTime, t, is_premium, language
}) => {
  const hasText = !!item.content;
  const hasImage = item.message_type === 'IMAGE' && !!mediaUrl;
  const isVoice = item.message_type === 'VOICE' && !!mediaUrl;
  const isVenue = (item.message_type as any) === 'VENUE_SUGGESTION';
  const isEvent = (item.message_type as any) === 'EVENT_SUGGESTION';
  const isSerenade = !!item.metadata?.is_serenade;
  const isExpired = isSerenade && !!item.metadata?.played_at && !isMine;

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const translateMessage = async () => {
    if (!is_premium) {
      Alert.alert(t('premium_join'), t('translation_premium_only'));
      return;
    }
    if (showOriginal || translatedText) {
      setShowOriginal(!showOriginal);
      return;
    }

    try {
      setIsTranslating(true);
      const res = await apiRequest<{ translatedText: string }>('/api/ai/translate', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ text: item.content, targetLang: language })
      });
      setTranslatedText(res.translatedText);
      setShowOriginal(false);
    } catch (e) {
      Alert.alert(t('error'), "Translation error");
    } finally {
      setIsTranslating(false);
    }
  };

  const playVoice = async () => {
    if (isExpired) return;
    try {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: mediaUrl! }, { shouldPlay: true });
      setSound(newSound);
      setPlaying(true);
      newSound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlaying(false);
          await newSound.unloadAsync();
          if (isSerenade && !isMine && !item.metadata?.played_at) {
            await apiRequest(`/api/messages/${item.id}/played`, { method: 'POST', requireAuth: true });
          }
        }
      });
    } catch (e) {
      console.error('Error playing sound', e);
    }
  };

  const venueData = isVenue ? (item.metadata as any)?.venue : null;
  const eventData = isEvent ? (item.metadata as any)?.event : null;

  return (
    <View style={[styles.messageRow, isMine && styles.myMessageRow]}>
      {!isMine && <Image source={{ uri: avatarUri }} style={styles.senderAvatar} />}
      <View style={[
        styles.bubble,
        isMine ? styles.myBubble : styles.theirBubble,
        isSerenade && styles.serenadeBubble,
        isVenue && styles.venueBubble,
        isEvent && styles.venueBubble
      ]}>
        {isSerenade && (
          <View style={styles.serenadeHeader}>
            <Music size={12} color={isMine ? '#fff' : '#e11d48'} />
            <Text style={[styles.serenadeLabel, isMine && { color: '#fff' }]}>{t('vocal_serenade')}</Text>
          </View>
        )}

        {isVenue && (
          <View style={styles.venueContent}>
            <Text style={styles.venueHint}>{isMine ? 'Vous proposez un lieu :' : 'Suggestion de rendez-vous :'}</Text>
            <View style={styles.venueCardInner}>
              <Image source={{ uri: venueData?.photo_url || 'https://placehold.co/80x80' }} style={styles.venueThumb} />
              <View style={styles.venueTextWrap}>
                <Text style={styles.venueNameText}>{venueData?.name}</Text>
                <Text style={styles.venueBenefitText}>🎁 {venueData?.benefit_description}</Text>
              </View>
            </View>
          </View>
        )}

        {isEvent && (
          <View style={styles.venueContent}>
            <Text style={styles.venueHint}>{isMine ? 'Vous proposez une sortie :' : 'Suggestion de sortie :'}</Text>
            <View style={styles.venueCardInner}>
              <Image source={{ uri: eventData?.photo_url || 'https://placehold.co/80x80' }} style={styles.venueThumb} />
              <View style={styles.venueTextWrap}>
                <Text style={styles.venueNameText}>{eventData?.title}</Text>
                <Text style={styles.venueBenefitText}>{eventData?.venues?.name}</Text>
              </View>
            </View>
          </View>
        )}

        {hasText && !isVenue && !isEvent && (
          <View>
            <Text style={[styles.messageText, isMine && styles.myMessageText]}>
              {showOriginal || !translatedText ? item.content : translatedText}
            </Text>
            {!isMine && (
              <Pressable style={styles.translateAction} onPress={translateMessage} disabled={isTranslating}>
                {isTranslating ? <ActivityIndicator size="small" color="#94a3b8" /> : (
                  <>
                    <Languages size={12} color="#94a3b8" />
                    <Text style={styles.translateText}>{translatedText && !showOriginal ? t('show_original') : t('translate')}</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}

        {isVoice && (
          <Pressable style={[styles.voiceAction, isExpired && styles.voiceExpired]} onPress={playVoice} disabled={playing || isExpired}>
            {isExpired ? <Trash2 size={20} color="#94a3b8" /> : (playing ? <ActivityIndicator color={isMine ? '#fff' : '#e11d48'} /> : <Play size={20} color={isMine ? '#fff' : '#e11d48'} fill={isMine ? '#fff' : '#e11d48'} />)}
            <Text style={[styles.voiceText, isMine && { color: '#fff' }, isExpired && { color: '#94a3b8' }]}>
              {isExpired ? 'Sérénade expirée' : playing ? 'Lecture...' : 'Écouter la sérénade'}
            </Text>
          </Pressable>
        )}

        {hasImage && <Image source={{ uri: mediaUrl! }} style={[styles.imageContent, (hasText || isVenue) && styles.mediaAfterText]} />}

        <Text style={[styles.messageMeta, isMine && styles.myMessageMeta]}>
          {displayTime}{isMine ? ` • ${item.is_read ? 'Lu ✓✓' : t('sent')}` : ''}
          {isSerenade && !isMine && !isExpired && ` • ${t('one_listen_only')}`}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  messageRow: { flexDirection: 'row', marginBottom: 4 },
  myMessageRow: { justifyContent: 'flex-end' },
  senderAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, alignSelf: 'flex-end' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 20 },
  myBubble: { backgroundColor: '#e11d48', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#f1f5f9', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  messageMeta: { fontSize: 10, marginTop: 4, opacity: 0.7 },
  myMessageMeta: { color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
  translateAction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  translateText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  serenadeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  serenadeLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  venueBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  venueContent: { gap: 10 },
  venueHint: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  venueCardInner: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  venueThumb: { width: 50, height: 50, borderRadius: 8 },
  venueTextWrap: { flex: 1 },
  venueNameText: { fontSize: 14, fontWeight: '800' },
  venueBenefitText: { fontSize: 12, color: '#e11d48', fontWeight: '700' },
  serenadeBubble: { backgroundColor: '#fff1f2', borderColor: '#fecdd3', borderWidth: 1 },
  voiceAction: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 },
  voiceText: { fontSize: 13, fontWeight: '700' },
  imageContent: { width: 200, height: 200, borderRadius: 12 },
  mediaAfterText: { marginTop: 10 },
  voiceExpired: { opacity: 0.5 },
});

export default ChatMessageItem;
