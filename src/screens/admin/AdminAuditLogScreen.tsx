import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiRequest } from '../../lib/api';
import { COLORS } from '../../data/mock';

type AuditAction = 'USER_DELETE_ADMIN' | 'USER_DELETE_PRIVACY';
type AuditFilter = 'ALL' | AuditAction;

type AuditUser = {
  id: string;
  name: string;
  email: string | null;
};

type AdminAuditLog = {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  reason: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  admin: AuditUser | null;
  target_user: AuditUser | null;
};

const ACTION_FILTERS: Array<{ value: AuditFilter; label: string }> = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'USER_DELETE_ADMIN', label: 'Suppressions admin' },
  { value: 'USER_DELETE_PRIVACY', label: 'Suppressions RGPD' },
];

const ACTION_LABELS: Record<string, string> = {
  USER_DELETE_ADMIN: 'Suppression admin',
  USER_DELETE_PRIVACY: 'Suppression RGPD',
};

const formatActionLabel = (action: string) => ACTION_LABELS[action] || action || 'Action';

const AdminAuditLogScreen: React.FC = () => {
  const [actionFilter, setActionFilter] = useState<AuditFilter>('ALL');
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const query = actionFilter === 'ALL'
        ? '?limit=200'
        : `?limit=200&action=${encodeURIComponent(actionFilter)}`;
      const response = await apiRequest<{ logs: AdminAuditLog[] }>(
        `/api/admin/audit-logs${query}`,
        { requireAuth: true }
      );
      setLogs(response.logs || []);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de charger les audits.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Audit suppressions</Text>
          <Pressable style={styles.refreshButton} onPress={() => void fetchLogs()}>
            <Text style={styles.refreshButtonText}>Actualiser</Text>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {ACTION_FILTERS.map((item) => (
            <Pressable
              key={item.value}
              style={[styles.filterChip, actionFilter === item.value && styles.filterChipActive]}
              onPress={() => setActionFilter(item.value)}
            >
              <Text style={[styles.filterChipText, actionFilter === item.value && styles.filterChipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? <Text style={styles.loadingText}>Chargement...</Text> : null}

        {!loading && logs.length === 0 ? (
          <Text style={styles.emptyText}>Aucun audit pour ce filtre.</Text>
        ) : (
          <View style={styles.list}>
            {logs.map((log) => {
              const adminLabel = log.admin?.email || log.admin?.name || log.admin_id;
              const targetLabel = log.target_user?.email || log.target_user?.name || log.target_user_id || 'N/A';
              const metadata = (log.metadata && typeof log.metadata === 'object') ? log.metadata : {};
              const reason = (log.reason || '').trim();
              return (
                <View key={log.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{formatActionLabel(log.action)}</Text>
                  <Text style={styles.cardMeta}>Admin: {adminLabel}</Text>
                  <Text style={styles.cardMeta}>Cible: {targetLabel}</Text>
                  {reason ? <Text style={styles.cardReason}>Motif: {reason}</Text> : null}
                  {metadata.source ? <Text style={styles.cardMeta}>Origine: {metadata.source}</Text> : null}
                  {metadata.request_id ? <Text style={styles.cardMeta}>Request ID: {metadata.request_id}</Text> : null}
                  {metadata.ip ? <Text style={styles.cardMeta}>IP: {metadata.ip}</Text> : null}
                  {metadata.user_agent ? <Text style={styles.cardMeta}>Agent: {metadata.user_agent}</Text> : null}
                  <Text style={styles.cardMeta}>
                    Date: {new Date(log.created_at).toLocaleString('fr-FR')}
                  </Text>
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
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.ink,
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refreshButtonText: {
    color: COLORS.ink,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#ffe4ea',
  },
  filterChipText: {
    color: COLORS.muted,
    fontWeight: '600',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  loadingText: {
    color: COLORS.muted,
  },
  emptyText: {
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  list: {
    gap: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 4,
  },
  cardMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  cardReason: {
    color: COLORS.ink,
    fontSize: 13,
    marginTop: 6,
  },
});

export default AdminAuditLogScreen;
