import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Archive,
  Bell,
  Calendar,
  CheckCheck,
  ChevronLeft,
  CreditCard,
  Heart,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import { apiRequest } from '../../lib/api';
import { useApp } from '../../state/AppContext';
import { COLORS } from '../../data/mock';

type NotificationType =
  | 'ALL'
  | 'MESSAGE'
  | 'LIKE_RECEIVED'
  | 'ROSE_RECEIVED'
  | 'STORY_LIKED'
  | 'MATCH_CREATED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'ADMIN'
  | 'SECURITY'
  | 'PARTNER'
  | 'AGENDA';

type GalantNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  target_route?: string | null;
  target_id?: string | null;
  metadata?: Record<string, any>;
  is_read?: boolean;
  created_at?: string;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FILTERS: Array<{ id: NotificationType; label: string }> = [
  { id: 'ALL', label: 'Toutes' },
  { id: 'MESSAGE', label: 'Messages' },
  { id: 'LIKE_RECEIVED', label: 'Likes' },
  { id: 'ROSE_RECEIVED', label: 'Roses' },
  { id: 'PAYMENT_SUCCESS', label: 'Paiements' },
  { id: 'AGENDA', label: 'Agenda' },
];

const iconForType = (type: NotificationType) => {
  if (type === 'MESSAGE') return MessageCircle;
  if (type === 'LIKE_RECEIVED') return Heart;
  if (type === 'PAYMENT_SUCCESS' || type === 'PAYMENT_FAILED') return CreditCard;
  if (type === 'SECURITY' || type === 'ADMIN') return ShieldCheck;
  if (type === 'PARTNER') return Store;
  if (type === 'AGENDA') return Calendar;
  if (type === 'ROSE_RECEIVED' || type === 'STORY_LIKED' || type === 'MATCH_CREATED') return Sparkles;
  return Bell;
};

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, activeTheme, currentUser } = useApp();
  const [notifications, setNotifications] = useState<GalantNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationType>('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '80' });
      if (filter !== 'ALL') params.set('type', filter);
      if (unreadOnly) params.set('unreadOnly', 'true');
      const payload = await apiRequest<{ notifications: GalantNotification[] }>(`/api/notifications?${params.toString()}`, { requireAuth: true });
      setNotifications(payload.notifications || []);
    } finally {
      setLoading(false);
    }
  }, [filter, unreadOnly]);

  useFocusEffect(useCallback(() => {
    void loadNotifications();
  }, [loadNotifications]));

  const unreadCount = useMemo(() => notifications.filter((item) => item.is_read !== true).length, [notifications]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, is_read: true } : item));
    await apiRequest(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST', requireAuth: true });
  };

  const archiveNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    await apiRequest(`/api/notifications/${encodeURIComponent(id)}/archive`, { method: 'POST', requireAuth: true });
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await apiRequest('/api/notifications/read-all', { method: 'POST', requireAuth: true });
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } finally {
      setMarkingAll(false);
    }
  };

  const openNotificationTarget = (item: GalantNotification) => {
    const route = item.target_route || '';
    const metadata = item.metadata || {};
    if (route.startsWith('/chat/')) {
      const id = route.replace('/chat/', '').split('?')[0];
      if (metadata.venue_chat_id) {
        navigation.navigate('Chat', { userId: metadata.sender_id || '', venueChatId: metadata.venue_chat_id });
      } else {
        navigation.navigate('Chat', { userId: metadata.sender_id || metadata.other_user_id || '', matchId: id });
      }
    } else if (route.startsWith('/likes')) {
      navigation.navigate('LikesInbox');
    } else if (route.startsWith('/roses')) {
      navigation.navigate('LikesReceived');
    } else if (route.startsWith('/stories')) {
      navigation.navigate('Status', { initialStatusId: metadata.story_id });
    } else if (route.startsWith('/premium')) {
      navigation.navigate('Premium');
    } else if (route.startsWith('/store')) {
      if (currentUser?.is_partner) {
        navigation.navigate('PartnerPremium');
      } else {
        navigation.navigate('Premium');
      }
    } else if (route.startsWith('/boost')) {
      navigation.navigate('Boost');
    } else if (route.startsWith('/verify')) {
      navigation.navigate('Verify');
    } else if (route.startsWith('/partner-discovery')) {
      navigation.navigate('PartnerDiscovery');
    } else if (route.startsWith('/partner')) {
      navigation.navigate('PartnerDashboard');
    } else if (route.startsWith('/agenda')) {
      navigation.navigate(currentUser?.is_partner ? 'PartnerDashboard' : 'MainTabs');
    } else {
      navigation.navigate(currentUser?.is_partner ? 'PartnerDashboard' : 'MainTabs');
    }
  };

  const openNotification = async (item: GalantNotification) => {
    if (item.is_read !== true) {
      try { await markAsRead(item.id); } catch {}
    }
    openNotificationTarget(item);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.eyebrow, { color: COLORS.primary }]}>CENTRE INTERNE</Text>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        </View>
        <Pressable style={[styles.markAllBtn, unreadCount === 0 && styles.disabledBtn]} onPress={markAllAsRead} disabled={unreadCount === 0 || markingAll}>
          <CheckCheck size={18} color="#fff" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.filterPill, { borderColor: colors.border, backgroundColor: filter === item.id ? COLORS.primary : colors.card }]}
              onPress={() => setFilter(item.id)}
            >
              <Text style={[styles.filterText, { color: filter === item.id ? '#fff' : colors.textMuted }]}>{item.label}</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.filterPill, { borderColor: colors.border, backgroundColor: unreadOnly ? colors.text : colors.card }]}
            onPress={() => setUnreadOnly((value) => !value)}
          >
            <Text style={[styles.filterText, { color: unreadOnly ? colors.bg : colors.textMuted }]}>Non lues</Text>
          </Pressable>
        </ScrollView>

        {loading ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Bell size={42} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune notification</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Les informations importantes apparaitront ici.</Text>
          </View>
        ) : notifications.map((item) => {
          const Icon = iconForType(item.type);
          const unread = item.is_read !== true;
          return (
            <View
              key={item.id}
              style={[
                styles.card,
                { backgroundColor: unread ? (activeTheme === 'dark' ? '#450a0a' : '#fff1f2') : colors.card, borderColor: unread ? COLORS.primary : colors.border }
              ]}
            >
              <Pressable style={styles.cardMain} onPress={() => void openNotification(item)}>
                <View style={[styles.iconWrap, { backgroundColor: unread ? COLORS.primary : colors.input }]}>
                  <Icon size={20} color={unread ? '#fff' : colors.textMuted} />
                </View>
                <View style={styles.cardText}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.title || 'Galant'}</Text>
                    {unread ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <Text style={[styles.cardMessage, { color: colors.textMuted }]}>{item.message}</Text>
                  <Text style={[styles.cardDate, { color: colors.textMuted }]}>{formatDate(item.created_at)}</Text>
                </View>
              </Pressable>
              <Pressable style={styles.archiveBtn} onPress={() => void archiveNotification(item.id)}>
                <Archive size={16} color={colors.textMuted} />
                <Text style={[styles.archiveText, { color: colors.textMuted }]}>Archiver</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { fontSize: 28, fontWeight: '900' },
  markAllBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: { opacity: 0.35 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  filters: { gap: 8, paddingBottom: 4 },
  filterPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  emptyState: {
    minHeight: 220,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptyText: { fontSize: 13, textAlign: 'center', fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 10,
  },
  cardMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '900' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  cardMessage: { fontSize: 13, fontWeight: '700', lineHeight: 19 },
  cardDate: { marginTop: 3, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  archiveBtn: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6 },
  archiveText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
});

export default NotificationsScreen;
