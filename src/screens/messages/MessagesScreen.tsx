import React from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/MainNavigator';
import { useApp } from '../../state/AppContext';
import { COLORS } from '../../data/mock';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MessagesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { matches, users, currentUser, messages } = useApp();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Matchs Récents</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchesRow}>
          {matches.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Swipe pour matcher !</Text>
            </View>
          )}
          {matches.map((match) => {
            if (!currentUser) return null;
            const userId = match.user_one_id === currentUser.id ? match.user_two_id : match.user_one_id;
            const user = users.find((u) => u.id === userId);
            if (!user) return null;
            return (
              <Pressable
                key={match.id}
                onPress={() => navigation.navigate('Chat', { userId: user.id, matchId: match.id })}
                style={styles.matchItem}
              >
                <Image source={{ uri: user.photos[0] }} style={styles.matchAvatar} />
                <Text style={styles.matchName}>{user.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.subtitle}>Conversations</Text>
        <View style={styles.list}>
          {matches.map((match) => {
            if (!currentUser) return null;
            const userId = match.user_one_id === currentUser.id ? match.user_two_id : match.user_one_id;
            const user = users.find((u) => u.id === userId);
            if (!user) return null;
            const thread = messages.filter((m) => m.match_id === match.id);
            const lastMessage = thread[thread.length - 1];
            const unreadCount = thread.filter((m) => !m.is_read && m.sender_id !== currentUser.id).length;

            return (
              <Pressable
                key={match.id}
                onPress={() => navigation.navigate('Chat', { userId: user.id, matchId: match.id })}
                style={styles.row}
              >
                <Image source={{ uri: user.photos[0] }} style={styles.rowAvatar} />
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{user.name}</Text>
                  <Text style={styles.rowMessage} numberOfLines={1}>
                    {lastMessage?.content || 'Clique pour ouvrir le chat...'}
                  </Text>
                </View>
                <View style={styles.rowMeta}>
                  <Text style={styles.rowTime}>Maintenant</Text>
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
          {matches.length === 0 && (
            <Text style={styles.emptyList}>Aucune conversation pour le moment.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
  },
  matchesRow: {
    gap: 16,
    paddingVertical: 8,
  },
  matchItem: {
    alignItems: 'center',
    gap: 6,
  },
  matchAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  matchName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.ink,
  },
  empty: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    color: COLORS.muted,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
  },
  list: {
    gap: 12,
  },
  row: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowName: {
    fontWeight: '700',
    color: COLORS.ink,
  },
  rowMessage: {
    fontSize: 12,
    color: COLORS.muted,
  },
  rowMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  rowTime: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyList: {
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default MessagesScreen;
