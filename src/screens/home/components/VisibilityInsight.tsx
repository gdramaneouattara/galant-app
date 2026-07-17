import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Rocket, Sparkles } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface VisibilityInsightProps {
  insight: any;
  currentUser: any;
  colors: any;
  activeTheme: string;
  t: (key: any, params?: any) => string;
  onAction: (action: string) => void;
}

const VisibilityInsight: React.FC<VisibilityInsightProps> = ({
  insight,
  currentUser,
  colors,
  activeTheme,
  t,
  onAction,
}) => {
  if (!insight?.recommendation) return null;

  return (
    <Pressable
      style={[
        styles.visibilityNudge,
        activeTheme === 'dark' && { backgroundColor: '#1e293b', borderColor: '#334155' },
      ]}
      onPress={() => onAction(insight.recommendation.action)}
    >
      <View style={styles.nudgeIconWrap}>
        {insight.recommendation.action === 'GOLDEN_ROSE' ? (
          <Sparkles size={20} color="#f59e0b" />
        ) : (
          <Rocket size={20} color="#0ea5e9" />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.nudgeTitle, { color: colors.text }]}>
          {insight.recommendation.title}
        </Text>
        <Text style={[styles.nudgeText, { color: colors.textMuted }]}>
          {insight.recommendation.text
            .replace('{rank}', insight.rank)
            .replace('{total}', insight.total)
            .replace('{city}', currentUser?.city || '')}
        </Text>
      </View>
      {insight.recommendation.action && (
        <View style={styles.nudgeActionBtn}>
          <Text style={styles.nudgeActionBtnText}>{t('propel')}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  visibilityNudge: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  nudgeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  nudgeText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  nudgeActionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  nudgeActionBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
});

export default VisibilityInsight;
