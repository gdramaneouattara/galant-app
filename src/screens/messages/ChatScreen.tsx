import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { rtdb, db, COLLECTIONS } from '../../lib/firebase';

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

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isMine = item.sender_id === currentUser?.id;
    return (
      <ChatMessageItem
        item={item}
        isMine={isMine}
        avatarUri={targetUser?.photos?.[0] || 'https://placehold.co/80x80'}
        mediaUrl={item.media_url || null}
        displayTime={item.created_at}
        t={t}
        is_premium={!!currentUser?.is_premium}
        language={language}
      />
    );
  }, [currentUser, targetUser, t, language]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ChatHeader
        title={targetUser?.name || 'Chat'}
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
      />

      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        onSend={handleSend}
        sending={sending}
        t={t}
        colors={colors}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  listContent: { padding: 16, gap: 16 },
});

export default ChatScreen;
