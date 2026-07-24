import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable, Alert, TextInput, ActivityIndicator } from 'react-native';
import { COLORS } from '../../data/mock';
import { apiRequest } from '../../lib/api';
import { User } from '../../types';

// Components
import UserCard from './components/UserCard';
import AdminFilterBar from './components/AdminFilterBar';

type AdminUser = User & {
  email?: string | null;
  is_admin?: boolean;
  is_premium?: boolean;
  is_verified?: boolean;
  suspended_at?: string | null;
};

type FilterKey = 'ALL' | 'SUSPENDED' | 'PREMIUM' | 'UNVERIFIED' | 'ADMINS';

const UserListScreen: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');

  const fetchUsers = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const userList = await apiRequest<AdminUser[]>('/api/admin/users', { requireAuth: true });
      setUsers(userList || []);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de charger les utilisateurs.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => { void fetchUsers(); }, []);

  const is_premium = (u: AdminUser) => u.is_premium === true;
  const is_verified = (u: AdminUser) => u.is_verified === true;
  const isAdmin = (u: AdminUser) => u.is_admin === true;
  const isSuspended = (u: AdminUser) => !!u.suspended_at;

  const filterCounts = useMemo(() => ({
    ALL: users.length,
    SUSPENDED: users.filter(isSuspended).length,
    PREMIUM: users.filter(is_premium).length,
    UNVERIFIED: users.filter(u => !is_verified(u)).length,
    ADMINS: users.filter(isAdmin).length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    return users.filter((u) => {
      const pass = activeFilter === 'ALL' || (activeFilter === 'SUSPENDED' && isSuspended(u)) || (activeFilter === 'PREMIUM' && is_premium(u)) || (activeFilter === 'UNVERIFIED' && !is_verified(u)) || (activeFilter === 'ADMINS' && isAdmin(u));
      if (!pass) return false;
      if (!q) return true;
      return `${u.name || ''} ${u.email || ''} ${u.phone || ''} ${u.id}`.toLowerCase().includes(q);
    });
  }, [users, query, activeFilter]);

  const handleSuspend = async (u: AdminUser) => {
    const willSuspend = !isSuspended(u);
    Alert.alert(`Confirmer`, `Voulez-vous ${willSuspend ? 'suspendre' : 'réactiver'} ${u.name || u.email || u.id} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', style: 'destructive', onPress: async () => {
        try {
          await apiRequest(`/api/admin/users/${u.id}/suspend`, { method: 'PUT', body: JSON.stringify({ suspend: willSuspend }), requireAuth: true });
          void fetchUsers(false);
        } catch (e: any) { Alert.alert('Erreur', e.message); }
      }}
    ]);
  };

  const handleDelete = async (u: AdminUser) => {
    Alert.alert('Supprimer', 'Cette action est définitive. Supprimer ce compte ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          setDeletingUserId(u.id);
          await apiRequest(`/api/admin/users/${u.id}`, { method: 'DELETE', requireAuth: true });
          void fetchUsers(false);
        } catch (e: any) { Alert.alert('Erreur', e.message); }
        finally { setDeletingUserId(null); }
      }}
    ]);
  };

  const handleReconcile = async () => {
    try {
      setReconciling(true);
      const res = await apiRequest<any>('/api/admin/users/reconcile-profiles', { method: 'POST', requireAuth: true });
      void fetchUsers(false);
      Alert.alert('Succès', `Profils créés: ${res.createdCount}`);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
    finally { setReconciling(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Utilisateurs</Text>
          <View style={styles.headerButtons}>
            <Pressable style={styles.reconcileBtn} onPress={handleReconcile} disabled={reconciling}>
              <Text style={styles.reconcileBtnText}>{reconciling ? '...' : 'Réconcilier'}</Text>
            </Pressable>
            <Pressable style={styles.refreshBtn} onPress={() => void fetchUsers()}><Text style={styles.refreshBtnText}>Actualiser</Text></Pressable>
          </View>
        </View>

        <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher (Nom, Email, UID...)" style={styles.searchInput} />

        <AdminFilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={filterCounts} />

        {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} /> : filteredUsers.length === 0 ? <Text style={styles.empty}>Aucun utilisateur trouvé.</Text> : (
          <View style={styles.userList}>
            {filteredUsers.map(u => <UserCard key={u.id} user={u} onSuspend={handleSuspend} onDelete={handleDelete} isDeleting={deletingUserId === u.id} />)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.ink },
  reconcileBtn: { borderWidth: 1, borderColor: '#7dd3fc', borderRadius: 10, backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 6 },
  reconcileBtnText: { color: '#0369a1', fontWeight: '700', fontSize: 12 },
  refreshBtn: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6 },
  refreshBtnText: { color: COLORS.ink, fontWeight: '700', fontSize: 12 },
  searchInput: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#dbe3ef', paddingHorizontal: 12, paddingVertical: 10, color: COLORS.ink },
  empty: { color: COLORS.muted, textAlign: 'center', paddingVertical: 24 },
  userList: { gap: 12 },
});

export default UserListScreen;
