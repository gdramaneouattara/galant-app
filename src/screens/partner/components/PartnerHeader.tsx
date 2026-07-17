import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Crown, Edit3, LogOut } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface PartnerHeaderProps {
  venueName: string;
  onOpenPremium: () => void;
  onOpenEdit: () => void;
  onLogout: () => void;
  colors: any;
}

const PartnerHeader: React.FC<PartnerHeaderProps> = ({
  venueName,
  onOpenPremium,
  onOpenEdit,
  onLogout,
  colors,
}) => {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.welcome, { color: colors.textMuted }]}>Espace Partenaire</Text>
        <Text style={[styles.venueName, { color: colors.text }]}>{venueName || 'Mon Établissement'}</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          onPress={onOpenPremium}
          style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: '#facc15', borderWidth: 2 }]}
        >
          <Crown size={20} color="#d97706" />
        </Pressable>
        <Pressable
          onPress={onOpenEdit}
          style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Edit3 size={20} color={COLORS.primary} />
        </Pressable>
        <Pressable
          onPress={onLogout}
          style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <LogOut size={20} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  welcome: {
    fontSize: 14,
    fontWeight: '700',
  },
  venueName: {
    fontSize: 24,
    fontWeight: '900',
  },
});

export default PartnerHeader;
