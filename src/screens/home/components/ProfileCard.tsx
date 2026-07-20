import React from 'react';
import {
  Animated,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import ProfileBadges from '../../../components/ProfileBadges';

interface ProfileCardProps {
  profile: any;
  swipePosition: Animated.ValueXY;
  panHandlers: any;
  onPress: () => void;
  t: (key: any, params?: any) => string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  swipePosition,
  panHandlers,
  onPress,
  t,
}) => {
  const rotate = swipePosition.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [
            { translateX: swipePosition.x },
            { rotate },
          ],
        },
      ]}
      {...panHandlers}
    >
      <Pressable style={{ flex: 1 }} onPress={onPress}>
        <ImageBackground
          source={{
            uri: profile.photos[0],
            cache: 'force-cache'
          }}
          style={styles.cardImage}
          imageStyle={{ borderRadius: 24 }}
        >
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {profile.name}, {profile.age}
              </Text>
              {profile.has_golden_rose && (
                <View style={[styles.superLikeReceivedPill, { backgroundColor: '#fbbf24' }]}>
                  <Text style={{ fontSize: 12 }}>✨</Text>
                  <Text style={[styles.superLikeReceivedPillText, { color: '#b45309' }]}>
                    Golden Rose
                  </Text>
                </View>
              )}
              {profile.super_liked_me ? (
                <View style={styles.superLikeReceivedPill}>
                  <Text style={{ fontSize: 12 }}>🌹</Text>
                  <Text style={styles.superLikeReceivedPillText}>{t('roses')}</Text>
                </View>
              ) : null}
              <ProfileBadges user={profile} />
            </View>
            <View style={styles.locRow}>
              <MapPin size={14} color="#fff" />
              <Text style={styles.locText}>
                {profile.city || '...'}
                {typeof profile.distance_km === 'number'
                  ? ` • ${profile.distance_km.toFixed(1)} km`
                  : ''}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardImage: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  cardInfo: {
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Playfair',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 1 },
  },
  superLikeReceivedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(225, 29, 72, 0.92)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  superLikeReceivedPillText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'InterBold',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locText: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'InterSemiBold',
    fontSize: 13,
    marginLeft: 2,
  },
});

export default ProfileCard;
