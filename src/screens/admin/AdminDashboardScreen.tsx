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
  };
  premiumByPlan: {
    MONTHLY: number;
    QUARTERLY: number;
    BIANNUAL: number;
    ANNUAL: number;
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
  'AuthFlow' | 'ResetPassword' | 'MainTabs' | 'AdminStack' | 'Chat' | 'CommunityChat' | 'Premium' | 'LikesReceived' | 'LikesInbox' | 'Verify' | 'Boost' | 'DiscoverGrid'
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
    route: 'AdminAuditLogs',
    title: 'Audit Logs',
    description: 'Traçabilité des actions administratives sensibles.',
  },
  {
    route: 'AdminMessaging',
    title: 'Notifications Push',
    description: 'Campagnes système, audience ciblée et historique d’envoi.',
  },
];

const AdminDashboardScreen: React.FC = () => {
  const { logout } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Espace d'administration</Text>
        <Text style={styles.subtitle}>Pilotage global des utilisateurs et abonnements.</Text>

        <Pressable
          style={styles.refreshButton}
          onPress={() => {
            setLoading(true);
            void fetchStats();
          }}
          accessibilityRole="button"
          accessibilityLabel="Rafraîchir les statistiques"
        >
          <Text style={styles.refreshButtonText}>Rafraîchir</Text>
        </Pressable>

        {loading ? <Text style={styles.infoText}>Chargement des indicateurs...</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {stats ? (
          <View style={styles.grid}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Utilisateurs totaux</Text>
              <Text style={styles.cardValue}>{stats.users.total}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Utilisateurs actifs</Text>
              <Text style={styles.cardValue}>{stats.users.active}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Comptes suspendus</Text>
              <Text style={styles.cardValue}>{stats.users.suspended}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Utilisateurs vérifiés</Text>
              <Text style={styles.cardValue}>{stats.users.verified}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Utilisateurs non vérifiés</Text>
              <Text style={styles.cardValue}>{stats.users.unverified}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Utilisateurs gratuits</Text>
              <Text style={styles.cardValue}>{stats.users.free}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Utilisateurs premium</Text>
              <Text style={styles.cardValue}>{stats.users.premium}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Premium invisibles</Text>
              <Text style={styles.cardValue}>{stats.users.invisiblePremium}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Comptes auth</Text>
              <Text style={styles.cardValue}>
                {stats.integrity?.authUsersTotal ?? '-'}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Auth sans profil</Text>
              <Text style={styles.cardValue}>
                {stats.integrity?.authUsersWithoutProfile ?? '-'}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>KYC en attente</Text>
              <Text style={styles.cardValue}>{stats.kyc?.pending ?? 0}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>KYC en revue</Text>
              <Text style={styles.cardValue}>{stats.kyc?.inReview ?? 0}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>KYC approuvés</Text>
              <Text style={styles.cardValue}>{stats.kyc?.approved ?? 0}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>KYC rejetés</Text>
              <Text style={styles.cardValue}>{stats.kyc?.rejected ?? 0}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Demandes KYC (7j)</Text>
              <Text style={styles.cardValue}>{stats.kyc?.requestsLast7Days ?? 0}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Signalements (ouverts)</Text>
              <Text style={styles.cardValue}>{stats.moderation?.reportsOpen ?? 0}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Signalements (en revue)</Text>
              <Text style={styles.cardValue}>{stats.moderation?.reportsInReview ?? 0}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Signalements (résolus)</Text>
              <Text style={styles.cardValue}>{stats.moderation?.reportsResolved ?? 0}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Signalements (rejetés)</Text>
              <Text style={styles.cardValue}>{stats.moderation?.reportsDismissed ?? 0}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>RGPD (ouvertes)</Text>
              <Text style={styles.cardValue}>{stats.privacy?.open ?? 0}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>RGPD (en cours)</Text>
              <Text style={styles.cardValue}>{stats.privacy?.inProgress ?? 0}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>RGPD (résolues)</Text>
              <Text style={styles.cardValue}>{stats.privacy?.resolved ?? 0}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>RGPD (rejetées)</Text>
              <Text style={styles.cardValue}>{stats.privacy?.rejected ?? 0}</Text>
            </View>
          </View>
        ) : null}

        {stats ? (
          <View style={styles.planCard}>
            <Text style={styles.planTitle}>Premium par type d'abonnement</Text>
            <Text style={styles.planItem}>Mensuel: {stats.premiumByPlan.MONTHLY}</Text>
            <Text style={styles.planItem}>Trimestriel: {stats.premiumByPlan.QUARTERLY}</Text>
            <Text style={styles.planItem}>Semestriel: {stats.premiumByPlan.BIANNUAL}</Text>
            <Text style={styles.planItem}>Annuel: {stats.premiumByPlan.ANNUAL}</Text>
            <Text style={styles.planItem}>Non classé: {stats.premiumByPlan.UNKNOWN}</Text>
          </View>
        ) : null}

        <View style={styles.shortcutsSection}>
          <Text style={styles.shortcutsTitle}>Modules back-office</Text>
          <View style={styles.shortcutsGrid}>
            {ADMIN_SHORTCUTS.map((shortcut) => (
              <Pressable
                key={shortcut.route}
                style={styles.shortcutCard}
                onPress={() => navigation.navigate(shortcut.route)}
                accessibilityRole="button"
                accessibilityLabel={`Ouvrir ${shortcut.title}`}
              >
                <Text style={styles.shortcutCardTitle}>{shortcut.title}</Text>
                <Text style={styles.shortcutCardDescription}>{shortcut.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={styles.logoutButton}
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
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.ink,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.muted,
    marginBottom: 12,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  refreshButtonText: {
    color: '#0369a1',
    fontWeight: '700',
  },
  infoText: {
    color: COLORS.muted,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '48%',
  },
  cardLabel: {
    color: COLORS.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  cardValue: {
    color: COLORS.ink,
    fontWeight: '900',
    fontSize: 22,
    marginTop: 6,
  },
  planCard: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  planTitle: {
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 8,
  },
  planItem: {
    color: COLORS.ink,
    marginBottom: 4,
  },
  shortcutsSection: {
    marginTop: 14,
    gap: 10,
  },
  shortcutsTitle: {
    fontWeight: '800',
    color: COLORS.ink,
    fontSize: 16,
  },
  shortcutsGrid: {
    gap: 10,
  },
  shortcutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shortcutCardTitle: {
    color: COLORS.ink,
    fontWeight: '800',
    marginBottom: 4,
  },
  shortcutCardDescription: {
    color: COLORS.muted,
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
