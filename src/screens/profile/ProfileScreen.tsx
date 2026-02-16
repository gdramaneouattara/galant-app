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
import { ChevronRight, Crown, LogOut, Settings, ShieldCheck } from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { COLORS } from '../../data/mock';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentUser, logout } = useApp();

  if (!currentUser) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.photoWrap}>
            <Image source={{ uri: currentUser.photos[0] }} style={styles.photo} />
          </View>
          <Text style={styles.name}>{currentUser.name}, {currentUser.age}</Text>
          <View style={[styles.badge, currentUser.isPremium ? styles.badgePremium : styles.badgeFree]}>
            {currentUser.isPremium && <Crown size={14} color="#d97706" />}
            <Text style={[styles.badgeText, currentUser.isPremium ? styles.badgeTextPremium : styles.badgeTextFree]}>
              {currentUser.isPremium ? 'Membre Premium' : 'MODÈLE GRATUIT'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Pressable style={styles.row}>
            <View style={styles.rowIcon}>
              <Settings size={18} color={COLORS.muted} />
            </View>
            <Text style={styles.rowLabel}>Paramètres de Compte</Text>
            <ChevronRight size={18} color="#cbd5f5" />
          </Pressable>
          {!currentUser.isVerified && (
            <Pressable style={[styles.row, styles.rowVerify]} onPress={() => navigation.navigate('Verify' as never)}>
              <View style={[styles.rowIcon, styles.rowIconVerify]}>
                <ShieldCheck size={18} color="#2563eb" />
              </View>
              <Text style={[styles.rowLabel, styles.rowLabelVerify]}>Vérifier mon identité</Text>
              <ChevronRight size={18} color="#93c5fd" />
            </Pressable>
          )}
          {!currentUser.isPremium && (
            <Pressable style={[styles.row, styles.rowPremium]} onPress={() => navigation.navigate('Premium' as never)}>
              <View style={[styles.rowIcon, styles.rowIconPremium]}>
                <Crown size={18} color="#d97706" />
              </View>
              <Text style={styles.rowLabel}>Passer Premium</Text>
              <ChevronRight size={18} color="#facc15" />
            </Pressable>
          )}
        </View>

        <Pressable style={[styles.row, styles.rowLogout]} onPress={logout}>
          <View style={[styles.rowIcon, styles.rowIconLogout]}>
            <LogOut size={18} color="#e11d48" />
          </View>
          <Text style={[styles.rowLabel, styles.rowLabelLogout]}>Déconnexion</Text>
        </Pressable>
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
    gap: 18,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  photoWrap: {
    width: 120,
    height: 120,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgePremium: {
    backgroundColor: '#fef3c7',
  },
  badgeFree: {
    backgroundColor: '#e2e8f0',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextPremium: {
    color: '#b45309',
  },
  badgeTextFree: {
    color: COLORS.muted,
  },
  section: {
    gap: 12,
  },
  row: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  rowLabel: {
    flex: 1,
    fontWeight: '700',
    color: COLORS.ink,
  },
  rowVerify: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  rowLabelVerify: {
    color: '#1d4ed8',
  },
  rowIconVerify: {
    backgroundColor: '#fff',
  },
  rowPremium: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  rowIconPremium: {
    backgroundColor: '#fff',
  },
  rowLogout: {
    backgroundColor: '#fff1f2',
    borderColor: '#ffe4e6',
  },
  rowIconLogout: {
    backgroundColor: '#fff',
  },
  rowLabelLogout: {
    color: '#be123c',
    fontWeight: '800',
  },
});

export default ProfileScreen;
