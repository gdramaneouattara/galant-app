import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../../../data/mock';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const RosePetal: React.FC<{ delay: number }> = ({ delay }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, SCREEN_HEIGHT + 50],
  });

  const translateX = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, Math.random() * 100 - 50, 0],
  });

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: Math.random() * SCREEN_WIDTH,
        fontSize: 20 + Math.random() * 10,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    >
      🌹
    </Animated.Text>
  );
};

interface MatchOverlayProps {
  visible: boolean;
  userName: string;
  onContinue: () => void;
  t: (key: any, params?: any) => string;
}

const MatchOverlay: React.FC<MatchOverlayProps> = ({
  visible,
  userName,
  onContinue,
  t,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.matchOverlay}>
        <RosePetal delay={0} />
        <RosePetal delay={500} />
        <RosePetal delay={1000} />
        <RosePetal delay={1500} />
        <RosePetal delay={2000} />
        <RosePetal delay={2500} />
        <RosePetal delay={3000} />
        <RosePetal delay={3500} />

        <Text style={styles.matchTitle}>{t('match_title')}</Text>
        <Text style={styles.matchSub}>{t('match_sub', { name: userName })}</Text>
        <Pressable style={styles.matchBtn} onPress={onContinue}>
          <Text style={styles.matchBtnText}>{t('continue')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  matchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255,107,107,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  matchTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
  },
  matchSub: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  matchBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
  },
  matchBtnText: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: 16,
  },
});

export default MatchOverlay;
