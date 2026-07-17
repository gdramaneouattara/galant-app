import React from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface VenueChat {
  id: string;
  profiles: {
    id: string;
    name: string;
    photos: string[];
  };
}

interface PartnerChatListProps {
  chats: VenueChat[];
  onOpenChat: (chat: VenueChat) => void;
  colors: any;
}

const PartnerChatList: React.FC<PartnerChatListProps> = ({
  chats,
  onOpenChat,
  colors,
}) => {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Messages Clients ({chats.length})
      </Text>
      {chats.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Aucun message pour le moment.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chatsRow}>
          {chats.map((chat) => (
            <Pressable
              key={chat.id}
              style={[styles.chatCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => onOpenChat(chat)}
            >
              <Image source={{ uri: chat.profiles.photos[0] }} style={styles.chatAvatar} />
              <Text style={[styles.chatName, { color: colors.text }]} numberOfLines={1}>
                {chat.profiles.name}
              </Text>
              <View style={styles.chatBadge}>
                <MessageSquare size={10} color="#fff" />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
  },
  chatsRow: {
    gap: 12,
  },
  chatCard: {
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    width: 90,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  chatName: {
    fontSize: 12,
    fontWeight: '700',
  },
  chatBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: COLORS.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PartnerChatList;
