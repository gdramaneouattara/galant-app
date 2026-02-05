import React, { useMemo, useState } from 'react';
import {
  ImageBackground,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Heart, MapPin, ShieldCheck, X } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { Match, User } from '../../types';
import { useApp } from '../../state/AppContext';
import { supabase } from '../../lib/supabase';
import { logError, logEvent } from '../../lib/analytics';

const HomeScreen: React.FC = () => {
  const { users, currentUser, matches, addMatch, refreshMatches } = useApp();
  const [homeTab, setHomeTab] = useState<'discover' | 'nearby'>('discover');
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [matchUser, setMatchUser] = useState<User | null>(null);

  const availableProfiles = useMemo(
    () => users.filter((u) => u.id !== currentUser?.id),
    [users, currentUser?.id]
  );
  const currentProfile = availableProfiles[swipeIndex % Math.max(availableProfiles.length, 1)];

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!currentProfile) return;
    if (direction === 'right' && currentUser) {
      const alreadyMatched = matches.some(
        (m) =>
          (m.user_one_id === currentUser.id && m.user_two_id === currentProfile.id) ||
          (m.user_two_id === currentUser.id && m.user_one_id === currentProfile.id)
      );
      if (!alreadyMatched) {
        const [userOne, userTwo] = [currentUser.id, currentProfile.id].sort();
        const { data, error } = await supabase
          .from('matches')
          .insert({ user_one_id: userOne, user_two_id: userTwo, status: 'ACTIVE' })
          .select()
          .single();
        if (error) {
          logError(error, { action: 'create_match' });
        } else if (data) {
          addMatch(data as Match);
          logEvent('ui', 'match_created', { matchId: data.id });
        }
      }
      await refreshMatches();
      setMatchUser(currentProfile);
    }
    setSwipeIndex((prev) => prev + 1);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.brand}>YAMO</Text>
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setHomeTab('discover')}
            style={[styles.tab, homeTab === 'discover' && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, homeTab === 'discover' && styles.tabLabelActive]}>Découvrir</Text>
          </Pressable>
          <Pressable
            onPress={() => setHomeTab('nearby')}
            style={[styles.tab, homeTab === 'nearby' && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, homeTab === 'nearby' && styles.tabLabelActive]}>À proximité</Text>
          </Pressable>
        </View>
      </View>

      {currentProfile ? (
        <View style={styles.card}>
          <ImageBackground source={{ uri: currentProfile.photos[0] }} style={styles.cardImage} imageStyle={styles.cardImageRadius}>
            <View style={styles.cardOverlay} />
            <View style={styles.cardInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{currentProfile.name}, {currentProfile.age}</Text>
                {currentProfile.isVerified && (
                  <ShieldCheck color="#60a5fa" size={18} />
                )}
              </View>
              <View style={styles.location}>
                <MapPin color={COLORS.secondary} size={14} />
                <Text style={styles.locationText}>{currentProfile.location.city}</Text>
              </View>
              <View style={styles.interests}>
                {currentProfile.interests.map((interest) => (
                  <View key={interest} style={styles.interestTag}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ImageBackground>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Plus de profils pour le moment.</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable onPress={() => handleSwipe('left')} style={[styles.actionBtn, styles.actionNo]}>
          <X color={COLORS.primary} size={30} />
        </Pressable>
        <Pressable onPress={() => handleSwipe('right')} style={[styles.actionBtn, styles.actionYes]}>
          <Heart color="#fff" size={36} />
        </Pressable>
      </View>

      <Modal visible={!!matchUser} transparent animationType="fade" onRequestClose={() => setMatchUser(null)}>
        <View style={styles.matchOverlay}>
          <View style={styles.matchCard}>
            <Text style={styles.matchTitle}>C'est un match !</Text>
            <Text style={styles.matchSubtitle}>Vous avez liké {matchUser?.name}</Text>
            <Pressable onPress={() => setMatchUser(null)} style={styles.matchButton}>
              <Text style={styles.matchButtonLabel}>Continuer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    gap: 16,
    marginBottom: 12,
  },
  brand: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 999,
    padding: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  card: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardImageRadius: {
    borderRadius: 32,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardInfo: {
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  locationText: {
    color: '#fff',
    fontSize: 12,
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  interestTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  interestText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 20,
  },
  actionBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  actionNo: {
    backgroundColor: '#fff',
  },
  actionYes: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
  },
  emptyCard: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.muted,
    fontWeight: '600',
  },
  matchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  matchTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  matchSubtitle: {
    color: COLORS.muted,
  },
  matchButton: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  matchButtonLabel: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default HomeScreen;
