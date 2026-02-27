import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, Image, Pressable, Alert, TextInput } from 'react-native';
import { COLORS } from '../../data/mock';
import { apiRequest } from '../../lib/api';
import { User } from '../../types';

type AdminUser = User & {
  email?: string | null;
  is_admin?: boolean;
  is_premium?: boolean;
  is_verified?: boolean;
  suspended_at?: string | null;
};

type ReconcileResponse = {
  createdCount: number;
  missingBefore: number;
  totalAuthUsers: number;
  totalProfiles: number;
};

type FilterKey = 'ALL' | 'SUSPENDED' | 'PREMIUM' | 'UNVERIFIED' | 'ADMINS';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'ALL', label: 'Tous' },
  { key: 'SUSPENDED', label: 'Suspendus' },
  { key: 'PREMIUM', label: 'Premium' },
  { key: 'UNVERIFIED', label: 'Non vérifiés' },
  { key: 'ADMINS', label: 'Admins' },
];

const UserListScreen: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');

  const fetchUsers = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const userList = await apiRequest<AdminUser[]>('/api/admin/users', { requireAuth: true });
      setUsers(userList);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de charger les utilisateurs.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const isPremium = (user: AdminUser) => user.is_premium === true || user.isPremium === true;
  const isVerified = (user: AdminUser) => user.is_verified === true || user.isVerified === true;
  const isAdmin = (user: AdminUser) => user.is_admin === true;
  const isSuspended = (user: AdminUser) => !!user.suspended_at;

  const filterCounts = useMemo(() => ({
    ALL: users.length,
    SUSPENDED: users.filter((user) => isSuspended(user)).length,
    PREMIUM: users.filter((user) => isPremium(user)).length,
    UNVERIFIED: users.filter((user) => !isVerified(user)).length,
    ADMINS: users.filter((user) => isAdmin(user)).length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((user) => {
      const passFilter = (() => {
        switch (activeFilter) {
          case 'SUSPENDED':
            return isSuspended(user);
          case 'PREMIUM':
            return isPremium(user);
          case 'UNVERIFIED':
            return !isVerified(user);
          case 'ADMINS':
            return isAdmin(user);
          default:
            return true;
        }
      })();

      if (!passFilter) return false;
      if (!q) return true;

      const haystack = `${user.name || ''} ${user.email || ''} ${user.id}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [users, query, activeFilter]);

  const toggleSuspend = async (user: AdminUser) => {
    if (isAdmin(user)) {
      Alert.alert('Action bloquée', 'La suspension d’un compte admin est désactivée.');
      return;
    }
    const willSuspend = !isSuspended(user);
    const label = user.name || user.email || user.id;
    Alert.alert(
      `Confirmer la ${willSuspend ? 'suspension' : 'réactivation'}`,
      `Voulez-vous vraiment ${willSuspend ? 'suspendre' : 'réactiver'} ${label} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await apiRequest(`/api/admin/users/${user.id}/suspend`, {
                method: 'PUT',
                body: JSON.stringify({ suspend: willSuspend }),
                requireAuth: true,
              });
              await fetchUsers(false);
            } catch (error: any) {
              Alert.alert('Erreur', error?.message || 'Impossible de modifier l\'utilisateur.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const reconcileMissingProfiles = async () => {
    if (reconciling) return;
    try {
      setReconciling(true);
      const result = await apiRequest<ReconcileResponse>('/api/admin/users/reconcile-profiles', {
        method: 'POST',
        requireAuth: true,
      });
      await fetchUsers(false);
      Alert.alert(
        'Réconciliation terminée',
        `Profils créés: ${result.createdCount}\nComptes auth sans profil (avant): ${result.missingBefore}`
      );
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de réconcilier les profils manquants.');
    } finally {
      setReconciling(false);
    }
  };

  const getUserInitial = (name: string) => name?.trim()?.charAt(0)?.toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Gestion des utilisateurs</Text>
          <View style={styles.headerButtons}>
            <Pressable style={styles.reconcileButton} onPress={() => void reconcileMissingProfiles()} disabled={reconciling}>
              <Text style={styles.reconcileButtonText}>{reconciling ? '...' : 'Réconcilier'}</Text>
            </Pressable>
            <Pressable style={styles.refreshButton} onPress={() => void fetchUsers()}>
              <Text style={styles.refreshButtonText}>Actualiser</Text>
            </Pressable>
          </View>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher par nom, email ou UID"
          style={styles.searchInput}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {FILTERS.map((filter) => {
            const selected = filter.key === activeFilter;
            return (
              <Pressable
                key={filter.key}
                style={[styles.filterChip, selected && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.key)}
              >
                <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                  {filter.label} ({filterCounts[filter.key]})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <Text style={styles.loading}>Chargement...</Text>
        ) : filteredUsers.length === 0 ? (
          <Text style={styles.empty}>Aucun utilisateur pour ce filtre.</Text>
        ) : (
          <View style={styles.userList}>
            {filteredUsers.map((user) => {
              const userIsAdmin = isAdmin(user);
              const userIsPremium = isPremium(user);
              const userIsVerified = isVerified(user);
              const userIsSuspended = isSuspended(user);

              return (
                <View key={user.id} style={styles.userCard}>
                  {user.photos?.[0] ? (
                    <Image source={{ uri: user.photos[0] }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>{getUserInitial(user.name)}</Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.name}>{user.name || 'Utilisateur sans nom'}</Text>
                    <Text style={styles.email}>{user.email || 'Email indisponible'}</Text>
                    <Text style={styles.uid}>UID: {user.id}</Text>

                    <View style={styles.badgesRow}>
                      {userIsAdmin ? <Text style={[styles.badge, styles.badgeAdmin]}>ADMIN</Text> : null}
                      {userIsPremium ? <Text style={[styles.badge, styles.badgePremium]}>PREMIUM</Text> : null}
                      {userIsVerified ? (
                        <Text style={[styles.badge, styles.badgeVerified]}>VÉRIFIÉ</Text>
                      ) : (
                        <Text style={[styles.badge, styles.badgeUnverified]}>NON VÉRIFIÉ</Text>
                      )}
                      {userIsSuspended ? <Text style={[styles.badge, styles.badgeSuspended]}>SUSPENDU</Text> : null}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => void toggleSuspend(user)}
                    style={[
                      styles.suspendButton,
                      userIsSuspended && styles.reactivateButton,
                      userIsAdmin && styles.adminLockedButton,
                    ]}
                    disabled={userIsAdmin}
                  >
                    <Text
                      style={[
                        styles.suspendButtonText,
                        userIsSuspended && styles.reactivateButtonText,
                        userIsAdmin && styles.adminLockedButtonText,
                      ]}
                    >
                      {userIsAdmin ? 'Admin' : userIsSuspended ? 'Réactiver' : 'Suspendre'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
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
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.ink,
  },
  reconcileButton: {
    borderWidth: 1,
    borderColor: '#7dd3fc',
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reconcileButtonText: {
    color: '#0369a1',
    fontWeight: '700',
    fontSize: 12,
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refreshButtonText: {
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 12,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe3ef',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.ink,
  },
  filtersRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#7dd3fc',
  },
  filterChipText: {
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: '#0369a1',
  },
  loading: {
    color: COLORS.muted,
  },
  empty: {
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  userList: {
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },
  avatarFallbackText: {
    fontWeight: '800',
    color: '#1e3a8a',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontWeight: '800',
    color: COLORS.ink,
  },
  email: {
    fontSize: 12,
    color: COLORS.ink,
    marginTop: 1,
  },
  uid: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgeAdmin: {
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
  },
  badgePremium: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  badgeVerified: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  badgeUnverified: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
  },
  badgeSuspended: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  suspendButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  reactivateButton: {
    backgroundColor: '#dcfce7',
  },
  adminLockedButton: {
    backgroundColor: '#e2e8f0',
  },
  suspendButtonText: {
    color: '#b91c1c',
    fontWeight: 'bold',
    fontSize: 12,
  },
  reactivateButtonText: {
    color: '#166534',
  },
  adminLockedButtonText: {
    color: '#475569',
  },
});

export default UserListScreen;
