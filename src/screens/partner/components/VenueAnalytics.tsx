import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Eye, BarChart2 } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface VenueAnalyticsProps {
  totalViews: number;
  weeklyHistory: { date: string; count: number }[];
  colors: any;
}

const VenueAnalytics: React.FC<VenueAnalyticsProps> = ({
  totalViews,
  weeklyHistory,
  colors,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Eye size={20} color={COLORS.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{totalViews}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Vues de la fiche</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <BarChart2 size={20} color={COLORS.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{Math.floor(totalViews * 0.4)}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Recommandations</Text>
        </View>
      </View>

      {weeklyHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Activité de la semaine</Text>
          <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.barsRow}>
              {weeklyHistory.map((day) => {
                const maxCount = Math.max(...weeklyHistory.map(h => h.count), 1);
                const barHeight = (day.count / maxCount) * 80;
                return (
                  <View key={day.date} style={styles.barCol}>
                    <View style={[styles.bar, { height: Math.max(barHeight, 4) }]} />
                    <Text style={[styles.barLabel, { color: colors.textMuted }]}>
                      {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  chartContainer: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
  },
  barCol: {
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    width: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

export default VenueAnalytics;
