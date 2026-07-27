import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, MoreVertical } from 'lucide-react-native';

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  isOnline?: boolean;
  onBack: () => void;
  onOpenSafety: () => void;
  colors: any;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  subtitle,
  isOnline = false,
  onBack,
  onOpenSafety,
  colors,
}) => {
  return (
    <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <ChevronLeft color={colors.text} size={28} />
      </Pressable>
      <View style={styles.headerInfo}>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{title || 'Chat'}</Text>
        {!!subtitle && (
          <View style={styles.subtitleRow}>
            <View style={[styles.presenceDot, isOnline ? styles.presenceDotOnline : styles.presenceDotOffline]} />
            <Text style={[styles.headerSubtitle, { color: isOnline ? '#16a34a' : colors.textMuted }]}>{subtitle}</Text>
          </View>
        )}
      </View>
      <Pressable onPress={onOpenSafety} style={styles.backBtn}>
        <MoreVertical color={colors.text} size={24} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'PlayfairBlack' },
  subtitleRow: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 5 },
  headerSubtitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  presenceDot: { width: 7, height: 7, borderRadius: 3.5 },
  presenceDotOnline: { backgroundColor: '#22c55e' },
  presenceDotOffline: { backgroundColor: '#94a3b8' },
});

export default ChatHeader;
