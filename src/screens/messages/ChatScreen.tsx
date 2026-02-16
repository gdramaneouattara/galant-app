import React, { useMemo, useState } from 'react';
import {
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
import { ChevronLeft, Crown, Send } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import { useApp } from '../../state/AppContext';
import { COLORS } from '../../data/mock';
import { supabase } from '../../lib/supabase';
import { logError, logEvent } from '../../lib/analytics';

type ChatRoute = RouteProp<RootStackParamList, 'Chat'>;

const ChatScreen: React.FC = () => {
  const { params } = useRoute<ChatRoute>();
  const navigation = useNavigation();
  const { currentUser, users, messages, addMessage } = useApp();
  const [inputText, setInputText] = useState('');

  if (!currentUser) {
    return null;
  }

  const matchedUser = useMemo(() => users.find((u) => u.id === params.userId), [params.userId, users]);
  const matchId = params.matchId;

  const thread = messages.filter((m) => m.match_id === matchId);

  useFocusEffect(
    React.useCallback(() => {
      const markRead = async () => {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('match_id', matchId)
          .neq('sender_id', currentUser.id);
      };
      markRead();
      return () => {};
    }, [matchId, currentUser.id])
  );

  const handleSend = () => {
    if (!currentUser.isPremium || !inputText.trim()) return;
    const send = async () => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: currentUser.id,
          content: inputText.trim(),
          is_read: false,
        })
        .select()
        .single();
      if (error) {
        logError(error, { action: 'send_message' });
        return;
      }
      if (data) {
        addMessage(data);
        logEvent('ui', 'message_sent', { matchId });
      }
    };
    send();
    setInputText('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <ChevronLeft color={COLORS.ink} size={22} />
        </Pressable>
        {matchedUser && (
          <View style={styles.headerInfo}>
            <Image source={{ uri: matchedUser.photos[0] }} style={styles.avatar} />
            <View>
              <Text style={styles.name}>{matchedUser.name}</Text>
              <Text style={styles.status}>En ligne</Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
        {thread.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Démarre la conversation ✨</Text>
          </View>
        ) : (
          thread.map((msg) => {
            const mine = msg.sender_id === currentUser.id;
            return (
              <View key={msg.id} style={[styles.bubble, mine ? styles.bubbleRight : styles.bubbleLeft]}>
                <Text style={[styles.bubbleText, mine ? styles.bubbleRightText : styles.bubbleLeftText]}>
                  {msg.content}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })}>
        {currentUser.isPremium ? (
          <View style={styles.inputRow}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Écrivez quelque chose..."
              style={styles.input}
              onSubmitEditing={handleSend}
            />
            <Pressable onPress={handleSend} style={styles.sendButton}>
              <Send color="#fff" size={18} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.premiumCard} onPress={() => navigation.navigate('Premium' as never)}>
            <View style={styles.premiumIcon}>
              <Crown color={COLORS.primary} size={22} />
            </View>
            <View style={styles.premiumText}>
              <Text style={styles.premiumTitle}>Répondez maintenant</Text>
              <Text style={styles.premiumSubtitle}>Abonnement Premium requis pour chatter.</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  back: {
    padding: 6,
    marginRight: 8,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    color: '#22c55e',
    fontWeight: '700',
  },
  messages: {
    padding: 16,
    gap: 10,
  },
  emptyState: {
    padding: 20,
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
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 14,
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
    borderRadius: 18,
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
    gap: 4,
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
