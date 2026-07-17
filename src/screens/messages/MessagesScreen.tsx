import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import { useApp } from '../../state/AppContext';
import { COLORS } from '../../data/mock';
import { apiRequest } from '../../lib/api';
import { db, COLLECTIONS } from '../../lib/firebase';
import { ShieldCheck, Gem, ChevronRight } from 'lucide-react-native';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type AdminNotification = {
  id: string;
  event_type?: string;
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
  const { matches, users, currentUser, messages, appResumeVersion, colors, activeTheme, t } = useApp();
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [venueChats, setVenueChats] = useState<any[]>([]);
  const [loadingAdminNotifications, setLoadingAdminNotifications] = useState(false);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  const fetchAdminNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoadingAdminNotifications(true);
      const snapshot = await db.collection('events')
        .where('user_id', '==', currentUser.id)
        .where('event_type', '==', 'ADMIN_NOTIFICATION')
        .orderBy('created_at', 'desc')
        .limit(5)
        .get();
      // Quality check: /api/notifications/admin

      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminNotification));
      setAdminNotifications(notifs);
    } catch (_error) {
      console.error('Error fetching notifications:', _error);
      setAdminNotifications([]);
    } finally {
      setLoadingAdminNotifications(false);
    }
  }, [currentUser]);

  const fetchVenueChats = useCallback(async () => {
    if (!currentUser) return;
    try {
      const snapshot = await db.collection('venue_chats')
        .where('user_id', '==', currentUser.id)
        .orderBy('created_at', 'desc')
        .get();

      const chats = await Promise.all(snapshot.docs.map(async doc => {
        const data = doc.data();
        const venueDoc = await db.collection('venues').doc(data.venue_id).get();
        return { id: doc.id, ...data, venues: venueDoc.exists() ? venueDoc.data() : null };
      }));
      setVenueChats(chats.filter(c => !!c.venues));
    } catch (e) {
      console.error('Error fetching venue chats:', e);
    }
  }, [currentUser]);

  const isNotificationUnread = (notification: AdminNotification) => (
    notification.is_read !== true && notification.metadata?.is_read !== true
  );

  const unreadCount = adminNotifications.filter(isNotificationUnread).length;
  const showAdminBox = loadingAdminNotifications || adminNotifications.length > 0;

  const formatConversationDateTime = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return `${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const recentMatches = useMemo(() => {
    if (!currentUser) return [];
    return matches
      .map((match) => {
        const userId = match.user_one_id === currentUser.id ? match.user_two_id : match.user_one_id;
        const user = users.find((candidate) => candidate.id === userId);
        if (!user) return null;
        return { match, user };
      })
      .filter((entry): entry is { match: any; user: any } => !!entry);
  }, [currentUser, matches, users]);

  const conversations = useMemo(() => {
    if (!currentUser) return [];
    return recentMatches
      .map(({ match, user }) => {
        const thread = messages.filter((m) => m.match_id === match.id);
        const lastMessage = thread[thread.length - 1];
        const unreadCountForMatch = thread.filter((m) => !m.is_read && m.sender_id !== currentUser.id).length;
        const lastActivityAt = lastMessage?.created_at || match.created_at;

        return { match, user, lastMessage, unreadCount: unreadCountForMatch, lastActivityAt };
      })
      .sort((a, b) => new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime());
  }, [currentUser, messages, recentMatches]);

  const markNotificationAsRead = async (id: string) => {
    try {
      await db.collection('events').doc(id).update({ is_read: true, 'metadata.is_read': true });
      setAdminNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (_error) {}
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAllAsRead(true);
      const batch = db.batch();
      adminNotifications.forEach(n => {
        if (!n.is_read) batch.update(db.collection('events').doc(n.id), { is_read: true });
      });
      await batch.commit();
      setAdminNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (_error) {} finally { setMarkingAllAsRead(false); }
  };

  useFocusEffect(useCallback(() => { void fetchAdminNotifications(); void fetchVenueChats(); }, [fetchAdminNotifications, fetchVenueChats, appResumeVersion]));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('messages')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{t('messages_subtitle')}</Text>
        </View>

        {showAdminBox && (
          <View style={[styles.adminBox, activeTheme === 'dark' && { backgroundColor: '#1e293b', borderColor: '#334155' }]}>
            <View style={styles.adminBoxHeader}>
              <Text style={[styles.adminBoxTitle, { color: colors.text }]}>Notifications</Text>
              {unreadCount > 0 && <View style={styles.adminUnreadBadge}><Text style={styles.adminUnreadBadgeText}>{unreadCount}</Text></View>}
            </View>
            {unreadCount > 0 && <Pressable style={styles.adminMarkAllButton} onPress={markAllAsRead} disabled={markingAllAsRead}><Text style={styles.adminMarkAllButtonText}>{markingAllAsRead ? '...' : t('mark_all_read')}</Text></Pressable>}
            {loadingAdminNotifications ? <Text style={styles.adminBoxEmpty}>Chargement...</Text> : (
              <View style={styles.adminList}>
                {adminNotifications.map(notification => (
                  <Pressable key={notification.id} style={[styles.adminItem, isNotificationUnread(notification) && styles.adminItemUnread]} onPress={() => markNotificationAsRead(notification.id)}>
                    <Text style={styles.adminItemTitle}>{notification.metadata?.title || notification.event_name}</Text>
                    <Text style={styles.adminItemMessage}>{notification.metadata?.message}</Text>
                    <Text style={styles.adminItemDate}>{new Date(notification.created_at).toLocaleString('fr-FR')}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        <Text style={[styles.title, { color: colors.text }]}>{t('matches')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchesRow}>
          {recentMatches.length === 0 && <View style={[styles.empty, { backgroundColor: colors.input, borderColor: colors.border }]}><Text style={[styles.emptyText, { color: colors.textMuted }]}>Swipe !</Text></View>}
          {recentMatches.map(({ match, user }) => (
            <Pressable key={match.id} onPress={() => navigation.navigate('Chat', { userId: user.id, matchId: match.id })} style={[styles.matchItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Image source={{ uri: user.photos[0] }} style={styles.matchAvatar} />
              <View style={styles.matchNameRow}>
                <Text style={[styles.matchName, { color: colors.text }]}>{user.name}</Text>
                {user.isVerified && <ShieldCheck size={12} color="#60a5fa" />}
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.subtitle, { color: colors.text }]}>Conversations</Text>
        <View style={styles.list}>
          {venueChats.map(vChat => (
            <Pressable key={vChat.id} onPress={() => navigation.navigate('Chat', { userId: vChat.venues.owner_id, venueChatId: vChat.id, venueName: vChat.venues.name, venuePhoto: vChat.venues.photo_url })} style={[styles.row, styles.venueRow, activeTheme === 'dark' && { backgroundColor: '#450a0a', borderColor: '#7f1d1d' }]}>
              <Image source={{ uri: vChat.venues.photo_url || 'https://placehold.co/100x100' }} style={styles.rowAvatar} />
              <View style={styles.rowText}>
                <View style={styles.rowNameRow}>
                  <Text style={[styles.rowName, { color: colors.text }]}>{vChat.venues.name}</Text>
                  <View style={styles.venueBadge}><Text style={styles.venueBadgeText}>{t('guide')}</Text></View>
                </View>
                <Text style={[styles.rowMessage, { color: colors.textMuted }]} numberOfLines={1}>{t('chat_host')}</Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </Pressable>
          ))}
          {conversations.map(({ match, user, lastMessage, unreadCount, lastActivityAt }) => (
            <Pressable key={match.id} onPress={() => navigation.navigate('Chat', { userId: user.id, matchId: match.id })} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Image source={{ uri: user.photos[0] }} style={styles.rowAvatar} />
              <View style={styles.rowText}>
                <View style={styles.rowNameRow}>
                  <Text style={[styles.rowName, { color: colors.text }]}>{user.name}</Text>
                  {user.isVerified && <ShieldCheck size={12} color="#60a5fa" />}
                  {(user.galanterie_score || 0) >= 4.5 && <Gem size={12} color="#be123c" />}
                </View>
                <Text style={[styles.rowMessage, { color: colors.textMuted }]} numberOfLines={1}>{lastMessage?.content || '...'}</Text>
              </View>
              <View style={styles.rowMeta}>
                <Text style={[styles.rowTime, { color: colors.textMuted }]}>{formatConversationDateTime(lastActivityAt)}</Text>
                {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
              </View>
            </Pressable>
          ))}
          {conversations.length === 0 && <Text style={[styles.emptyList, { color: colors.textMuted }]}>...</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24, gap: 14 },
  header: { paddingHorizontal: 2, marginBottom: 2 },
  headerTitle: { fontSize: 31, fontWeight: '900' },
  headerSubtitle: { marginTop: 4, fontSize: 14, fontWeight: '500' },
  adminBox: { borderRadius: 18, padding: 14, gap: 10, borderWidth: 1 },
  adminBoxHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adminBoxTitle: { fontSize: 15, fontWeight: '800' },
  adminUnreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#de6464', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  adminUnreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  adminMarkAllButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  adminMarkAllButtonText: { fontSize: 11, fontWeight: '700' },
  adminBoxEmpty: { fontSize: 12 },
  adminList: { gap: 8 },
  adminItem: { borderRadius: 12, padding: 10, gap: 4, borderWidth: 1 },
  adminItemUnread: { borderColor: '#efb8b8', backgroundColor: '#fdeeee' },
  adminItemTitle: { fontWeight: '700', fontSize: 13 },
  adminItemMessage: { fontSize: 12 },
  adminItemDate: { fontSize: 11 },
  title: { fontSize: 20, fontWeight: '800' },
  matchesRow: { gap: 14, paddingVertical: 6 },
  matchItem: { alignItems: 'center', gap: 7, borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  matchAvatar: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: '#df6767' },
  matchName: { fontSize: 12, fontWeight: '700' },
  matchNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  empty: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  emptyText: { fontWeight: '600' },
  subtitle: { fontSize: 20, fontWeight: '800' },
  list: { gap: 10 },
  row: { paddingHorizontal: 12, paddingVertical: 11, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowAvatar: { width: 56, height: 56, borderRadius: 18 },
  venueRow: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  venueBadge: { backgroundColor: '#e11d48', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  venueBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  rowText: { flex: 1, gap: 5 },
  rowName: { fontWeight: '800', fontSize: 16 },
  rowNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowMessage: { fontSize: 13 },
  rowMeta: { alignItems: 'flex-end', gap: 8 },
  rowTime: { fontSize: 11, fontWeight: '700' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#de6464', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  emptyList: { textAlign: 'center', paddingVertical: 18, fontWeight: '600' },
});

export default MessagesScreen;
