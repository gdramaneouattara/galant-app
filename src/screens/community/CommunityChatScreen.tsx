import React, { useEffect, useState, useRef } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Linking,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChevronLeft, Send, Image as ImageIcon, Video, Crown, Users } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { uploadArrayBufferToBucket } from '../../lib/storageUpload';

interface CommunityMessage {
  id: string;
  content: string;
  message_type: 'TEXT' | 'IMAGE' | 'VIDEO';
  media_url?: string;
  created_at: string;
  sender_id: string;
  profiles: {
    name: string;
    photos: string[];
  } | null;
}

type CommunityRole = 'MEMBER' | 'MODERATOR' | 'ADMIN';

interface CommunityMember {
  user_id: string;
  role: CommunityRole;
  joined_at: string;
  profiles: {
    name: string;
    photos: string[];
    is_verified?: boolean;
    is_premium?: boolean;
  } | null;
}

type CommunityMembersResponse = {
  members: CommunityMember[];
};

const ROLE_LABELS: Record<CommunityRole, string> = {
  MEMBER: 'Membre',
  MODERATOR: 'Moderateur',
  ADMIN: 'Admin',
};

const CommunityChatScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { currentUser } = useApp();
  const { communityId, communityName } = route.params;

  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [resolvedMediaUrls, setResolvedMediaUrls] = useState<Record<string, string>>({});
  const [membersVisible, setMembersVisible] = useState(false);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const currentMembership = members.find((member) => member.user_id === currentUser?.id) || null;
  const currentMemberRole = currentMembership?.role || null;
  const canManageRoles = currentMemberRole === 'ADMIN';
  const canRemoveMembers = currentMemberRole === 'ADMIN' || currentMemberRole === 'MODERATOR';

  const fetchMessages = async () => {
    try {
      const data = await apiRequest<CommunityMessage[]>(`/api/communities/${communityId}/messages`, {
        requireAuth: true,
      });
      setMessages(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const response = await apiRequest<CommunityMembersResponse>(`/api/communities/${communityId}/members`, {
        requireAuth: true,
      });
      setMembers(response.members || []);
    } catch (error) {
      console.error(error);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    void fetchMessages();
    void fetchMembers();

    const channel = supabase
      .channel(`community_${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_messages',
          filter: `community_id=eq.${communityId}`,
        },
        () => {
          void fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_members',
          filter: `community_id=eq.${communityId}`,
        },
        () => {
          void fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId]);

  useEffect(() => {
    let cancelled = false;

    const hydrateMediaUrls = async () => {
      const mediaMessages = messages.filter((message) => (
        (message.message_type === 'IMAGE' || message.message_type === 'VIDEO') && !!message.media_url
      ));

      for (const message of mediaMessages) {
        const mediaPath = message.media_url as string;
        if (resolvedMediaUrls[mediaPath]) continue;

        if (/^https?:\/\//i.test(mediaPath)) {
          if (!cancelled) {
            setResolvedMediaUrls((prev) => ({ ...prev, [mediaPath]: mediaPath }));
          }
          continue;
        }

        const { data, error } = await supabase.storage
          .from('community-media')
          .createSignedUrl(mediaPath, 3600);

        if (cancelled) return;
        if (!error && data?.signedUrl) {
          setResolvedMediaUrls((prev) => ({ ...prev, [mediaPath]: data.signedUrl }));
        }
      }
    };

    void hydrateMediaUrls();

    return () => {
      cancelled = true;
    };
  }, [messages, resolvedMediaUrls]);

  const handleSend = async (
    type: 'TEXT' | 'IMAGE' | 'VIDEO' = 'TEXT',
    mediaUrl?: string,
    mediaMeta?: { mediaMimeType?: string; mediaSizeBytes?: number }
  ) => {
    if (sending) return;
    if (type === 'TEXT' && !inputText.trim()) return;

    if (type !== 'TEXT' && !currentUser?.isPremium) {
      Alert.alert('Premium requis', 'Le partage de photos et vidéos est réservé aux membres Premium.');
      return;
    }

    setSending(true);
    try {
      await apiRequest(`/api/communities/${communityId}/messages`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          content: type === 'TEXT' ? inputText.trim() : '',
          message_type: type,
          media_url: mediaUrl,
          mediaMimeType: mediaMeta?.mediaMimeType,
          mediaSizeBytes: mediaMeta?.mediaSizeBytes,
        }),
      });
      setInputText('');
      void fetchMessages(); // On rafraîchit pour voir son propre message immédiatement
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || "Impossible d'envoyer le message.");
    } finally {
      setSending(false);
    }
  };

  const pickMedia = async (type: 'IMAGE' | 'VIDEO') => {
    if (!currentUser) return;
    if (!currentUser.isPremium) {
      Alert.alert('Premium requis', 'Passez Premium pour partager des médias dans la communauté.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'IMAGE' ? 'images' : 'videos',
      allowsEditing: true,
      quality: 0.7,
      videoMaxDuration: 15,
    });

    if (!result.canceled && result.assets[0].uri) {
      const uri = result.assets[0].uri;
      try {
        const fileExt = (uri.split('.').pop() || (type === 'VIDEO' ? 'mp4' : 'jpg')).toLowerCase();
        const contentType = result.assets[0].mimeType
          || (type === 'VIDEO'
            ? (fileExt === 'mov' ? 'video/quicktime' : 'video/mp4')
            : (fileExt === 'png' ? 'image/png' : 'image/jpeg'));
        const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
        const filePath = `${communityId}/${fileName}`;

        const uploadResult = await uploadArrayBufferToBucket({
          bucket: 'community-media',
          path: filePath,
          uri,
          contentType,
          upsert: false,
        });

        void handleSend(type, filePath, {
          mediaMimeType: contentType,
          mediaSizeBytes: uploadResult.bytes,
        });
      } catch (e) {
        Alert.alert('Erreur Upload', "Impossible d'envoyer le média.");
      }
    }
  };

  const updateMemberRole = async (userId: string, role: CommunityRole) => {
    setMemberActionId(userId);
    try {
      await apiRequest(`/api/communities/${communityId}/members/${userId}/role`, {
        method: 'PATCH',
        requireAuth: true,
        body: JSON.stringify({ role }),
      });
      await fetchMembers();
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de modifier ce rôle.');
    } finally {
      setMemberActionId(null);
    }
  };

  const removeMember = (member: CommunityMember) => {
    const isSelf = member.user_id === currentUser?.id;
    Alert.alert(
      isSelf ? 'Quitter la communauté' : 'Retirer ce membre',
      isSelf
        ? 'Vous ne verrez plus les messages de cette communauté.'
        : 'Ce membre sera retiré de la communauté.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: isSelf ? 'Quitter' : 'Retirer',
          style: 'destructive',
          onPress: async () => {
            setMemberActionId(member.user_id);
            try {
              await apiRequest(`/api/communities/${communityId}/members/${member.user_id}`, {
                method: 'DELETE',
                requireAuth: true,
              });
              await fetchMembers();
              if (isSelf) {
                setMembersVisible(false);
                navigation.goBack();
              }
            } catch (error: any) {
              Alert.alert('Erreur', error?.message || 'Impossible de mettre à jour les membres.');
            } finally {
              setMemberActionId(null);
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: CommunityMessage }) => {
    const isMine = item.sender_id === currentUser?.id;
    const profile = item.profiles;
    const resolvedMediaUrl = item.media_url ? resolvedMediaUrls[item.media_url] : null;

    return (
      <View style={[styles.messageRow, isMine && styles.myMessageRow]}>
        {!isMine && (
          <Image
            source={{ uri: profile?.photos?.[0] || 'https://via.placeholder.com/150' }}
            style={styles.miniAvatar}
          />
        )}
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          {!isMine && <Text style={styles.senderName}>{profile?.name || 'Anonyme'}</Text>}

          {item.message_type === 'TEXT' && (
            <Text style={[styles.messageText, isMine && styles.myMessageText]}>{item.content}</Text>
          )}

          {item.message_type === 'IMAGE' && (
            resolvedMediaUrl ? <Image source={{ uri: resolvedMediaUrl }} style={styles.mediaContent} resizeMode="cover" /> : null
          )}

          {item.message_type === 'VIDEO' && (
            <Pressable
              style={styles.videoContainer}
              onPress={() => {
                if (resolvedMediaUrl) {
                  void Linking.openURL(resolvedMediaUrl);
                }
              }}
            >
              <View style={styles.videoPlaceholder}>
                <Video size={28} color="#fff" />
                <Text style={styles.videoPlaceholderText}>Ouvrir la vidéo</Text>
              </View>
            </Pressable>
          )}

          <Text style={[styles.time, isMine && styles.myTime]}>
            {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={COLORS.ink} size={24} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.communityName}>{communityName}</Text>
          <Text style={styles.activeStatus}>{members.length || 0} membres</Text>
        </View>
        <Pressable
          onPress={() => {
            setMembersVisible(true);
            void fetchMembers();
          }}
          style={styles.membersButton}
        >
          <Users color={COLORS.ink} size={20} />
        </Pressable>
      </View>

      {loading && messages.length === 0 ? (
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Soyez le premier à poster !</Text>
            </View>
          }
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputArea}>
          <View style={styles.mediaButtons}>
            <Pressable onPress={() => pickMedia('IMAGE')} style={styles.mediaBtn}>
              <ImageIcon size={20} color={currentUser?.isPremium ? COLORS.primary : '#cbd5e1'} />
            </Pressable>
            <Pressable onPress={() => pickMedia('VIDEO')} style={styles.mediaBtn}>
              <Video size={20} color={currentUser?.isPremium ? COLORS.primary : '#cbd5e1'} />
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Écris un message..."
            placeholderTextColor="#94a3b8"
            multiline
          />

          <Pressable
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={() => void handleSend()}
            disabled={sending || !inputText.trim()}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
          </Pressable>
        </View>
        {!currentUser?.isPremium && (
          <View style={styles.premiumHint}>
            <Crown size={12} color="#f59e0b" />
            <Text style={styles.premiumHintText}>Premium requis pour envoyer des photos/vidéos</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal visible={membersVisible} transparent animationType="slide" onRequestClose={() => setMembersVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.membersModal}>
            <View style={styles.membersHeader}>
              <View>
                <Text style={styles.membersTitle}>Membres</Text>
                <Text style={styles.membersSubtitle}>{communityName}</Text>
              </View>
              <Pressable onPress={() => setMembersVisible(false)} style={styles.membersCloseButton}>
                <ChevronLeft color={COLORS.ink} size={20} />
              </Pressable>
            </View>

            {membersLoading ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={COLORS.primary} />
            ) : (
              <FlatList
                data={members}
                keyExtractor={(item) => item.user_id}
                contentContainerStyle={styles.membersList}
                renderItem={({ item }) => {
                  const isSelf = item.user_id === currentUser?.id;
                  const canModeratorRemove = currentMemberRole === 'MODERATOR' && item.role === 'MEMBER' && !isSelf;
                  const canShowRemoveAction = (canRemoveMembers && !isSelf && currentMemberRole === 'ADMIN') || canModeratorRemove;

                  return (
                    <View style={styles.memberCard}>
                      <View style={styles.memberIdentity}>
                        <Image
                          source={{ uri: item.profiles?.photos?.[0] || 'https://via.placeholder.com/150' }}
                          style={styles.memberAvatar}
                        />
                        <View style={styles.memberMeta}>
                          <Text style={styles.memberName}>
                            {item.profiles?.name || 'Membre'}
                            {isSelf ? ' (vous)' : ''}
                          </Text>
                          <View style={[
                            styles.roleBadge,
                            item.role === 'ADMIN'
                              ? styles.roleBadgeAdmin
                              : item.role === 'MODERATOR'
                                ? styles.roleBadgeModerator
                                : styles.roleBadgeMember,
                          ]}>
                            <Text style={[
                              styles.roleBadgeText,
                              item.role === 'ADMIN'
                                ? styles.roleBadgeTextAdmin
                                : item.role === 'MODERATOR'
                                  ? styles.roleBadgeTextModerator
                                  : styles.roleBadgeTextMember,
                            ]}>
                              {ROLE_LABELS[item.role]}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {canManageRoles && !isSelf ? (
                        <View style={styles.memberActions}>
                          {(['MEMBER', 'MODERATOR', 'ADMIN'] as CommunityRole[]).map((role) => (
                            <Pressable
                              key={role}
                              style={[
                                styles.roleAction,
                                item.role === role && styles.roleActionActive,
                              ]}
                              onPress={() => void updateMemberRole(item.user_id, role)}
                              disabled={memberActionId === item.user_id}
                            >
                              <Text style={[
                                styles.roleActionText,
                                item.role === role && styles.roleActionTextActive,
                              ]}>
                                {ROLE_LABELS[role]}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}

                      {canShowRemoveAction ? (
                        <Pressable
                          style={styles.removeMemberButton}
                          onPress={() => removeMember(item)}
                          disabled={memberActionId === item.user_id}
                        >
                          <Text style={styles.removeMemberButtonText}>Retirer</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                }}
                ListFooterComponent={currentMembership ? (
                  <Pressable
                    style={styles.leaveCommunityButton}
                    onPress={() => removeMember(currentMembership)}
                    disabled={memberActionId === currentMembership.user_id}
                  >
                    <Text style={styles.leaveCommunityButtonText}>Quitter la communauté</Text>
                  </Pressable>
                ) : null}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { marginLeft: 8, flex: 1 },
  membersButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#f1f5f9' },
  communityName: { fontSize: 18, fontWeight: '800', color: COLORS.ink },
  activeStatus: { fontSize: 12, color: '#22c55e', fontWeight: '600' },
  list: { padding: 16, gap: 16 },
  messageRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  myMessageRow: { justifyContent: 'flex-end' },
  miniAvatar: { width: 32, height: 32, borderRadius: 10, alignSelf: 'flex-end' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 20 },
  myBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  senderName: { fontSize: 11, fontWeight: '800', color: COLORS.muted, marginBottom: 4 },
  messageText: { fontSize: 15, color: COLORS.ink, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  mediaContent: { width: 240, height: 240, borderRadius: 12, marginTop: 4 },
  videoContainer: { width: 240, height: 240, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' },
  videoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  videoPlaceholderText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  time: { fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 4, alignSelf: 'flex-end' },
  myTime: { color: 'rgba(255,255,255,0.7)' },
  empty: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { color: COLORS.muted, fontWeight: '600' },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 10 },
  mediaButtons: { flexDirection: 'row', gap: 8 },
  mediaBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 15, color: COLORS.ink, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#cbd5e1' },
  premiumHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6, backgroundColor: '#fffbeb' },
  premiumHintText: { fontSize: 11, color: '#b45309', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-end' },
  membersModal: { maxHeight: '82%', backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  membersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  membersTitle: { fontSize: 22, fontWeight: '900', color: COLORS.ink },
  membersSubtitle: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  membersCloseButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '90deg' }] },
  membersList: { paddingBottom: 24, gap: 12 },
  memberCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18, padding: 14, backgroundColor: '#fff', gap: 12 },
  memberIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#e2e8f0' },
  memberMeta: { flex: 1, gap: 6 },
  memberName: { fontSize: 15, fontWeight: '800', color: COLORS.ink },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  roleBadgeAdmin: { backgroundColor: '#fef3c7' },
  roleBadgeModerator: { backgroundColor: '#dbeafe' },
  roleBadgeMember: { backgroundColor: '#e2e8f0' },
  roleBadgeText: { fontSize: 11, fontWeight: '800' },
  roleBadgeTextAdmin: { color: '#b45309' },
  roleBadgeTextModerator: { color: '#1d4ed8' },
  roleBadgeTextMember: { color: '#475569' },
  memberActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleAction: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1' },
  roleActionActive: { backgroundColor: '#eff6ff', borderColor: '#60a5fa' },
  roleActionText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  roleActionTextActive: { color: '#1d4ed8' },
  removeMemberButton: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fef2f2' },
  removeMemberButtonText: { fontSize: 12, fontWeight: '800', color: '#b91c1c' },
  leaveCommunityButton: { marginTop: 12, borderRadius: 16, backgroundColor: '#0f172a', paddingVertical: 14, alignItems: 'center' },
  leaveCommunityButtonText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});

export default CommunityChatScreen;
