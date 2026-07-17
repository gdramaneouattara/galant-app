import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, MoreVertical } from 'lucide-react-native';

interface ChatHeaderProps {
  title: string;
  onBack: () => void;
  onOpenSafety: () => void;
  colors: any;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title || 'Chat'}</Text>
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
});

export default ChatHeader;
