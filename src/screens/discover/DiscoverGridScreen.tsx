import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { useApp } from '../../state/AppContext';
import { COLORS } from '../../data/mock';
import { Rocket } from 'lucide-react-native';

const DiscoverGridScreen: React.FC = () => {
  const { users, currentUser } = useApp();

  if (!currentUser) {
    return null;
  }

  const sortedUsers = [...users].sort((a, b) => {
    const aBoosted = a.boosted_until && new Date(a.boosted_until) > new Date();
    const bBoosted = b.boosted_until && new Date(b.boosted_until) > new Date();
    if (aBoosted && !bBoosted) return -1;
    if (!aBoosted && bBoosted) return 1;
    return 0;
  });

  const currentUserIndex = sortedUsers.findIndex(u => u.id === currentUser.id);
  const userRank = currentUserIndex + 1;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Classement Découverte</Text>
        {userRank > 0 ? (
          <Text style={styles.subtitle}>
            Vous êtes à la position <Text style={styles.rank}>#{userRank}</Text> sur {sortedUsers.length} profils.
          </Text>
        ) : (
          <Text style={styles.subtitle}>Votre profil n'a pas été trouvé dans le classement.</Text>
        )}
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {sortedUsers.map((user) => {
          const isCurrentUser = user.id === currentUser.id;
          const isBoosted = user.boosted_until && new Date(user.boosted_until) > new Date();
          return (
            <View key={user.id} style={[styles.card, isCurrentUser && styles.currentUserCard]}>
              <Image source={{ uri: user.photos[0] }} style={styles.photo} />
              <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
              {isBoosted && (
                <View style={styles.boostIcon}>
                  <Rocket size={14} color="#fff" />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.ink,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: COLORS.muted,
    marginTop: 4,
  },
  rank: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 10,
    gap: 10,
  },
  card: {
    width: '45%',
    aspectRatio: 3 / 4,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currentUserCard: {
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  name: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  boostIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#8b5cf6',
    borderRadius: 999,
    padding: 6,
  },
});

export default DiscoverGridScreen;
