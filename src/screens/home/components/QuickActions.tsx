import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Crown, Heart, Plane, Rocket } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface QuickActionsProps {
  navigation: any;
  currentUser: any;
  colors: any;
  activeTheme: string;
  t: (key: any, params?: any) => string;
  likesInboxCount: number;
  rosesInboxCount: number;
  canAccessLikesInbox: boolean;
  onOpenBoost: () => void;
  onShowGoldenRose: () => void;
  onShowPassport: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  navigation,
  currentUser,
  colors,
  activeTheme,
  t,
  likesInboxCount,
  rosesInboxCount,
  canAccessLikesInbox,
  onOpenBoost,
  onShowGoldenRose,
  onShowPassport,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.quickActions}
      style={styles.quickActionsWrapper}
    >
      <Pressable
        style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate('Premium')}
      >
        <View style={styles.quickActionRow}>
          <View style={[styles.quickActionIconWrap, { backgroundColor: colors.input }]}>
            <Crown color="#b45309" size={14} />
          </View>
          <Text style={[styles.quickActionTitle, { color: colors.text }]}>
            {t('subscriptions')}
          </Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onOpenBoost}
      >
        <View style={styles.quickActionRow}>
          <View style={[styles.quickActionIconWrap, { backgroundColor: colors.input }]}>
            <Rocket color="#0ea5e9" size={14} />
          </View>
          <Text style={[styles.quickActionTitle, { color: colors.text }]}>
            {t('boosts')}
          </Text>
        </View>
      </Pressable>

      <Pressable
        style={[
          styles.quickActionBtn,
          { borderColor: '#fbbf24', backgroundColor: activeTheme === 'dark' ? '#451a03' : '#fffbeb' },
        ]}
        onPress={onShowGoldenRose}
      >
        <View style={styles.quickActionRow}>
          <View style={[styles.quickActionIconWrap, { backgroundColor: '#fbbf24' }]}>
            <Text style={{ fontSize: 10 }}>✨</Text>
          </View>
          <Text style={[styles.quickActionTitle, { color: '#b45309' }]}>{t('rose_box')}</Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate('LikesReceived')}
      >
        <View style={styles.quickActionRow}>
          <View style={[styles.quickActionIconWrap, { backgroundColor: colors.input }]}>
            <Text style={{ fontSize: 11 }}>🌹</Text>
          </View>
          <Text style={[styles.quickActionTitle, { color: colors.text }]}>{t('roses')}</Text>
          {rosesInboxCount > 0 ? (
            <View style={styles.quickActionCountPill}>
              <Text style={styles.quickActionCountText}>{rosesInboxCount}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <Pressable
        style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onShowPassport}
      >
        <View style={styles.quickActionRow}>
          <View style={[styles.quickActionIconWrap, { backgroundColor: colors.input }]}>
            <Plane color="#e11d48" size={14} />
          </View>
          <Text style={[styles.quickActionTitle, { color: colors.text }]}>
            {currentUser?.passport_city
              ? t('passport_active_at', { city: currentUser.passport_city })
              : t('passport_galant').split(' ')[0]}
          </Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          if (!canAccessLikesInbox) {
            navigation.navigate('Premium');
            return;
          }
          navigation.navigate('LikesInbox');
        }}
      >
        <View style={styles.quickActionRow}>
          <View style={[styles.quickActionIconWrap, { backgroundColor: colors.input }]}>
            <Heart color="#dc2626" size={14} />
          </View>
          <Text style={[styles.quickActionTitle, { color: colors.text }]}>
            {t('likes_received')}
          </Text>
          {likesInboxCount > 0 ? (
            <View style={styles.quickActionCountPill}>
              <Text style={styles.quickActionCountText}>{likesInboxCount}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  quickActionsWrapper: {
    maxHeight: 60,
    marginBottom: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  quickActionBtn: {
    minWidth: 120,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickActionIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: { fontSize: 11, fontWeight: '900' },
  quickActionCountPill: {
    marginLeft: 'auto',
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
});

export default QuickActions;
