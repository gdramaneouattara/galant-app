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
  const showAdminBox = loadingAdminNotifications || adminNotifications.length > 0;

  const formatConversationDateTime = useCallback((value?: string) => {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const datePart = date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
    const timePart = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} ${timePart}`;
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>Retrouvez vos matchs et conversations</Text>
        </View>

        {showAdminBox ? (
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
        ) : null}

        <Text style={styles.title}>Matchs récents</Text>
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
                <Text style={styles.rowTime}>{formatConversationDateTime(lastActivityAt)}</Text>
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

        <View style={styles.securityCard}>
          <Text style={styles.securityTitle}>Messages protégés</Text>
          <Text style={styles.securitySub}>Yamo veille à votre sécurité et confidentialité.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f6efeb',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 14,
  },
  header: {
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 31,
    fontWeight: '900',
    color: '#251f1b',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b625d',
    fontWeight: '500',
  },
  adminBox: {
    backgroundColor: '#f1e4d6',
    borderWidth: 1,
    borderColor: '#e7d5c3',
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  adminBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminBoxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3a312c',
  },
  adminUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#de6464',
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
    borderColor: '#edcfa7',
    backgroundColor: '#f5d7af',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adminMarkAllButtonText: {
    color: '#5d4430',
    fontSize: 11,
    fontWeight: '700',
  },
  adminBoxEmpty: {
    color: '#756c67',
    fontSize: 12,
  },
  adminList: {
    gap: 8,
  },
  adminItem: {
    backgroundColor: '#f8f1ea',
    borderWidth: 1,
    borderColor: '#e8d8ca',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  adminItemUnread: {
    borderColor: '#efb8b8',
    backgroundColor: '#fdeeee',
  },
  adminItemTitle: {
    color: '#2f2925',
    fontWeight: '700',
    fontSize: 13,
  },
  adminItemMessage: {
    color: '#4f4742',
    fontSize: 12,
  },
  adminItemDate: {
    color: '#837b75',
    fontSize: 11,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2c2622',
  },
  matchesRow: {
    gap: 14,
    paddingVertical: 6,
  },
  matchItem: {
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#f5eae1',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ead8ca',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  matchAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#df6767',
  },
  matchName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2d2723',
  },
  matchNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  empty: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f4e7db',
    borderWidth: 1,
    borderColor: '#e8d8c8',
  },
  emptyText: {
    color: '#7c736e',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2c2622',
  },
  list: {
    gap: 10,
  },
  row: {
    backgroundColor: '#f3e9e1',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ebdcd0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
  },
  rowText: {
    flex: 1,
    gap: 5,
  },
  rowName: {
    fontWeight: '800',
    color: '#211c19',
    fontSize: 16,
  },
  rowNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowMessage: {
    fontSize: 13,
    color: '#5f5752',
  },
  rowMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  rowTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8e847e',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#de6464',
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
    color: '#7a716b',
    textAlign: 'center',
    paddingVertical: 18,
    fontWeight: '600',
  },
  securityCard: {
    marginTop: 6,
    backgroundColor: '#dce9df',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cad8ce',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  securityTitle: {
    fontWeight: '800',
    color: '#1f3328',
    fontSize: 12,
  },
  securitySub: {
    marginTop: 1,
    color: '#406150',
    fontSize: 11,
    lineHeight: 14,
  },
});

export default MessagesScreen;
