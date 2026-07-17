import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, Pressable, Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../data/mock';
import { apiRequest } from '../../lib/api';
import { useApp } from '../../state/AppContext';
import type { RootStackParamList } from '../../navigation/MainNavigator';

type AdminStats = {
  generatedAt: string;
  users: {
    total: number;
    active: number;
    suspended: number;
    admins: number;
    verified: number;
    unverified: number;
    premium: number;
    free: number;
    invisiblePremium: number;
    male: number;
    female: number;
  };
  premiumByPlan: {
    MONTHLY: number;
    QUARTERLY: number;
    UNKNOWN: number;
  };
  kyc?: {
    totalRequests: number;
    pending: number;
    inReview: number;
    approved: number;
    rejected: number;
    requestsLast7Days: number;
  };
  moderation?: {
    reportsTotal: number;
    reportsOpen: number;
    reportsInReview: number;
    reportsResolved: number;
    reportsDismissed: number;
  };
  privacy?: {
    requestsTotal: number;
    open: number;
    inProgress: number;
    resolved: number;
    rejected: number;
  };
  integrity?: {
    authUsersTotal: number | null;
    profilesTotal: number;
    authUsersWithoutProfile: number | null;
  };
};

type AdminDestination = Exclude<
  keyof RootStackParamList,
  'AuthFlow' | 'ResetPassword' | 'MainTabs' | 'AdminStack' | 'Chat' | 'Premium' | 'LikesReceived' | 'LikesInbox' | 'Verify' | 'Boost' | 'DiscoverGrid' | 'ProfileDetail' | 'Status' | 'VenueDetail' | 'PartnerDashboard' | 'PartnerPremium'
>;

type AdminShortcut = {
  route: AdminDestination;
  title: string;
  description: string;
};

const ADMIN_SHORTCUTS: AdminShortcut[] = [
  {
    route: 'AdminUserList',
    title: 'Gestion Utilisateurs',
    description: 'Liste complète, suspension et vérification des profils.',
  },
  {
    route: 'AdminModeration',
    title: 'Modération & RGPD',
    description: 'Signalements, revues photo et demandes confidentialité.',
  },
  {
    route: 'AdminKyc',
    title: 'Revues KYC',
    description: 'Validation manuelle des pièces d’identité et selfies.',
  },
  {
    route: 'AdminMessaging',
    title: 'Notifications Push',
    description: 'Campagnes système, audience ciblée et historique d’envoi.',
  },
  {
    route: 'AdminVenues',
    title: 'Guide & Partenaires',
    description: 'Modération des lieux et validation des avantages Galant.',
  },
];

const AdminDashboardScreen: React.FC = () => {
  const { logout, colors, activeTheme } = useApp();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const data = await apiRequest<AdminStats>('/api/admin/stats', { requireAuth: true });
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Espace d'administration</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Pilotage global des utilisateurs et abonnements.</Text>

        <Pressable
          style={[styles.refreshButton, { backgroundColor: activeTheme === 'dark' ? '#1e293b' : '#e0f2fe', borderColor: activeTheme === 'dark' ? '#334155' : '#bae6fd' }]}
          onPress={() => {
            setLoading(true);
            void fetchStats();
          }}
          accessibilityRole="button"
          accessibilityLabel="Rafraîchir les statistiques"
        >
          <Text style={[styles.refreshButtonText, { color: activeTheme === 'dark' ? '#38bdf8' : '#0369a1' }]}>Rafraîchir</Text>
        </Pressable>

        {loading ? <Text style={[styles.infoText, { color: colors.textMuted }]}>Chargement des indicateurs...</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {stats ? (
          <View style={styles.grid}>
            {[
              { label: 'Utilisateurs totaux', value: stats.users.total },
              { label: 'Hommes (Masculin)', value: stats.users.male },
              { label: 'Femmes (Féminin)', value: stats.users.female },
              { label: 'Utilisateurs actifs', value: stats.users.active },
              { label: 'Comptes suspendus', value: stats.users.suspended },
              { label: 'Utilisateurs vérifiés', value: stats.users.verified },
              { label: 'Utilisateurs non vérifiés', value: stats.users.unverified },
              { label: 'Utilisateurs gratuits', value: stats.users.free },
              { label: 'Utilisateurs premium', value: stats.users.premium },
              { label: 'Premium invisibles', value: stats.users.invisiblePremium },
              { label: 'Comptes auth', value: stats.integrity?.authUsersTotal ?? '-' },
              { label: 'Auth sans profil', value: stats.integrity?.authUsersWithoutProfile ?? '-' },
              { label: 'KYC en attente', value: stats.kyc?.pending ?? 0 },
              { label: 'KYC en revue', value: stats.kyc?.inReview ?? 0 },
              { label: 'KYC approuvés', value: stats.kyc?.approved ?? 0 },
              { label: 'KYC rejetés', value: stats.kyc?.rejected ?? 0 },
              { label: 'Demandes KYC (7j)', value: stats.kyc?.requestsLast7Days ?? 0 },
              { label: 'Signalements (ouverts)', value: stats.moderation?.reportsOpen ?? 0 },
              { label: 'Signalements (en revue)', value: stats.moderation?.reportsInReview ?? 0 },
              { label: 'Signalements (résolus)', value: stats.moderation?.reportsResolved ?? 0 },
              { label: 'Signalements (rejetés)', value: stats.moderation?.reportsDismissed ?? 0 },
              { label: 'RGPD (ouvertes)', value: stats.privacy?.open ?? 0 },
              { label: 'RGPD (en cours)', value: stats.privacy?.inProgress ?? 0 },
              { label: 'RGPD (résolues)', value: stats.privacy?.resolved ?? 0 },
              { label: 'RGPD (rejetées)', value: stats.privacy?.rejected ?? 0 },
            ].map((item, idx) => (
              <View key={idx} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>{item.label}</Text>
                <Text style={[styles.cardValue, { color: colors.text }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {stats ? (
          <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.planTitle, { color: colors.text }]}>Premium par type d'abonnement</Text>
            <Text style={[styles.planItem, { color: colors.text }]}>Mensuel: {stats.premiumByPlan.MONTHLY}</Text>
            <Text style={[styles.planItem, { color: colors.text }]}>Trimestriel: {stats.premiumByPlan.QUARTERLY}</Text>
            <Text style={[styles.planItem, { color: colors.text }]}>Non classé: {stats.premiumByPlan.UNKNOWN}</Text>
          </View>
        ) : null}

        <View style={styles.shortcutsSection}>
          <Text style={[styles.shortcutsTitle, { color: colors.text }]}>Modules back-office</Text>
          <View style={styles.shortcutsGrid}>
            {ADMIN_SHORTCUTS.map((shortcut) => (
              <Pressable
                key={shortcut.route}
                style={[styles.shortcutCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate(shortcut.route)}
                accessibilityRole="button"
                accessibilityLabel={`Ouvrir ${shortcut.title}`}
              >
                <Text style={[styles.shortcutCardTitle, { color: colors.text }]}>{shortcut.title}</Text>
                <Text style={[styles.shortcutCardDescription, { color: colors.textMuted }]}>{shortcut.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={[styles.logoutButton, activeTheme === 'dark' && { backgroundColor: '#450a0a', borderColor: '#7f1d1d' }]}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
        >
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    marginBottom: 12,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  refreshButtonText: {
    fontWeight: '700',
  },
  infoText: {
    marginBottom: 8,
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    width: '48%',
  },
  cardLabel: {
    fontWeight: '700',
    fontSize: 12,
  },
  cardValue: {
    fontWeight: '900',
    fontSize: 22,
    marginTop: 6,
  },
  planCard: {
    marginTop: 14,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  planTitle: {
    fontWeight: '800',
    marginBottom: 8,
  },
  planItem: {
    marginBottom: 4,
  },
  shortcutsSection: {
    marginTop: 14,
    gap: 10,
  },
  shortcutsTitle: {
    fontWeight: '800',
    fontSize: 16,
  },
  shortcutsGrid: {
    gap: 10,
  },
  shortcutCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  shortcutCardTitle: {
    fontWeight: '800',
    marginBottom: 4,
  },
  shortcutCardDescription: {
    lineHeight: 18,
  },
  logoutButton: {
    marginTop: 16,
    backgroundColor: '#fff1f2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ffe4e6',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#be123c',
    fontWeight: '800',
  },
});

export default AdminDashboardScreen;
