import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import { useApp } from '../../state/AppContext';
import { COLORS } from '../../data/mock';
import { apiRequest } from '../../lib/api';
import { ShieldCheck } from 'lucide-react-native';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type AdminNotification = {
  id: string;
  event_name: string;
  is_read?: boolean;
  metadata: {
    title?: string | null;
    message?: string;
    sent_at?: string;
    segment?: string;
    is_read?: boolean;
    read_at?: string | null;
  } | null;
  created_at: string;
};

const MessagesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { matches, users, currentUser, messages } = useApp();
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [loadingAdminNotifications, setLoadingAdminNotifications] = useState(false);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  const fetchAdminNotifications = useCallback(async () => {
    try {
      setLoadingAdminNotifications(true);
      const payload = await apiRequest<{ notifications: AdminNotification[]; unreadCount: number }>(
        '/api/notifications/admin?limit=5',
        { requireAuth: true }
      );
      setAdminNotifications(payload.notifications || []);
    } catch (_error) {
      setAdminNotifications([]);
    } finally {
      setLoadingAdminNotifications(false);
    }
  }, []);

  const isNotificationUnread = (notification: AdminNotification) => (
    notification.is_read !== true && notification.metadata?.is_read !== true
  );

  const unreadCount = adminNotifications.filter(isNotificationUnread).length;

  const formatConversationTime = useCallback((value?: string) => {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const isSameDay = now.toDateString() === date.toDateString();

    if (isSameDay) {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  }, []);

  const recentMatches = useMemo(() => {
    if (!currentUser) return [];

    return matches
      .map((match) => {
        const userId = match.user_one_id === currentUser.id ? match.user_two_id : match.user_one_id;
        const user = users.find((candidate) => candidate.id === userId);
        if (!user) return null;

        return { match, user };
      })
      .filter((entry): entry is { match: typeof matches[number]; user: typeof users[number] } => !!entry);
  }, [currentUser, matches, users]);

  const conversations = useMemo(() => {
    if (!currentUser) return [];

    return recentMatches
      .map(({ match, user }) => {
        const thread = messages.filter((message) => message.match_id === match.id);
        const lastMessage = thread[thread.length - 1];
        const unreadCountForMatch = thread.filter((message) => !message.is_read && message.sender_id !== currentUser.id).length;
        const lastActivityAt = lastMessage?.created_at || match.created_at;

        return {
          match,
          user,
          lastMessage,
          unreadCount: unreadCountForMatch,
          lastActivityAt,
        };
      })
      .sort((left, right) => {
        const leftTs = left.lastActivityAt ? new Date(left.lastActivityAt).getTime() : 0;
        const rightTs = right.lastActivityAt ? new Date(right.lastActivityAt).getTime() : 0;
        return rightTs - leftTs;
      });
  }, [currentUser, messages, recentMatches]);

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await apiRequest(`/api/notifications/admin/${notificationId}/read`, {
        method: 'POST',
        requireAuth: true,
      });
      setAdminNotifications((prev) => prev.map((item) => (
        item.id === notificationId
          ? { ...item, is_read: true, metadata: { ...(item.metadata || {}), is_read: true, read_at: new Date().toISOString() } }
          : item
      )));
    } catch (_error) {
      // Silent fail to avoid interrupting message browsing.
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAllAsRead(true);
      await apiRequest('/api/notifications/admin/read-all', {
        method: 'POST',
        requireAuth: true,
      });
      setAdminNotifications((prev) => prev.map((item) => ({
        ...item,
        is_read: true,
        metadata: {
          ...(item.metadata || {}),
          is_read: true,
          read_at: new Date().toISOString(),
        },
      })));
    } catch (_error) {
      // Silent fail to avoid blocking UI.
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void fetchAdminNotifications();
    }, [fetchAdminNotifications])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.adminBox}>
          <View style={styles.adminBoxHeader}>
            <Text style={styles.adminBoxTitle}>Notifications admin</Text>
            {unreadCount > 0 ? (
              <View style={styles.adminUnreadBadge}>
                <Text style={styles.adminUnreadBadgeText}>{unreadCount}</Text>
              </View>
            ) : null}
          </View>
          {unreadCount > 0 ? (
            <Pressable style={styles.adminMarkAllButton} onPress={() => void markAllAsRead()} disabled={markingAllAsRead}>
              <Text style={styles.adminMarkAllButtonText}>{markingAllAsRead ? '...' : 'Tout marquer lu'}</Text>
            </Pressable>
          ) : null}
          {loadingAdminNotifications ? (
            <Text style={styles.adminBoxEmpty}>Chargement...</Text>
          ) : adminNotifications.length === 0 ? (
            <Text style={styles.adminBoxEmpty}>Aucune notification administrative.</Text>
          ) : (
            <View style={styles.adminList}>
              {adminNotifications.map((notification) => (
                <Pressable key={notification.id} style={[styles.adminItem, isNotificationUnread(notification) && styles.adminItemUnread]} onPress={() => void markNotificationAsRead(notification.id)}>
                  <Text style={styles.adminItemTitle}>
                    {notification.metadata?.title || notification.event_name || 'Information administrateur'}
                  </Text>
                  <Text style={styles.adminItemMessage}>
                    {notification.metadata?.message || 'Message non disponible.'}
                  </Text>
                  <Text style={styles.adminItemDate}>
                    {new Date(notification.metadata?.sent_at || notification.created_at).toLocaleString('fr-FR')}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.title}>Matchs Récents</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchesRow}>
          {recentMatches.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Swipe pour matcher !</Text>
            </View>
          )}
          {recentMatches.map(({ match, user }) => (
            <Pressable
              key={match.id}
              onPress={() => navigation.navigate('Chat', { userId: user.id, matchId: match.id })}
              style={styles.matchItem}
            >
              <Image source={{ uri: user.photos[0] }} style={styles.matchAvatar} />
              <View style={styles.matchNameRow}>
                <Text style={styles.matchName}>{user.name}</Text>
                {user.isVerified ? <ShieldCheck size={12} color="#60a5fa" /> : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.subtitle}>Conversations</Text>
        <View style={styles.list}>
          {conversations.map(({ match, user, lastMessage, unreadCount: conversationUnreadCount, lastActivityAt }) => (
            <Pressable
              key={match.id}
              onPress={() => navigation.navigate('Chat', { userId: user.id, matchId: match.id })}
              style={styles.row}
            >
              <Image source={{ uri: user.photos[0] }} style={styles.rowAvatar} />
              <View style={styles.rowText}>
                <View style={styles.rowNameRow}>
                  <Text style={styles.rowName}>{user.name}</Text>
                  {user.isVerified ? <ShieldCheck size={12} color="#60a5fa" /> : null}
                </View>
                <Text style={styles.rowMessage} numberOfLines={1}>
                  {lastMessage?.content || 'Clique pour ouvrir le chat...'}
                </Text>
              </View>
              <View style={styles.rowMeta}>
                <Text style={styles.rowTime}>{formatConversationTime(lastActivityAt)}</Text>
                {conversationUnreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{conversationUnreadCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
          {conversations.length === 0 && (
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
  adminBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  adminBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminBoxTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
  },
  adminUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  adminUnreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  adminMarkAllButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adminMarkAllButtonText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '700',
  },
  adminBoxEmpty: {
    color: COLORS.muted,
    fontSize: 12,
  },
  adminList: {
    gap: 8,
  },
  adminItem: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  adminItemUnread: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  adminItemTitle: {
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 13,
  },
  adminItemMessage: {
    color: COLORS.ink,
    fontSize: 12,
  },
  adminItemDate: {
    color: COLORS.muted,
    fontSize: 11,
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
  matchNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  rowNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
