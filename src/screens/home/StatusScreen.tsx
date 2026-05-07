import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Plus, X, Play } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { uploadArrayBufferToBucket } from '../../lib/storageUpload';
import VideoPlayer from '../../components/VideoPlayer';

interface Status {
  id: string;
  user_id: string;
  content: string;
  media_url: string;
  message_type: 'TEXT' | 'IMAGE' | 'VIDEO';
  created_at: string;
  profiles: {
    name: string;
    photos: string[];
  };
}

const StatusScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentUser } = useApp();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  const fetchStatuses = useCallback(async () => {
    try {
      const data = await apiRequest<Status[]>('/api/statuses', { requireAuth: true });
      setStatuses(data || []);

      // Hydrate signed URLs
      for (const s of (data || [])) {
        if (s.media_url && !resolvedUrls[s.media_url]) {
          const { data: urlData } = await supabase.storage.from('statuses').createSignedUrl(s.media_url, 3600);
          if (urlData?.signedUrl) {
            setResolvedUrls(prev => ({ ...prev, [s.media_url]: urlData.signedUrl }));
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [resolvedUrls]);

  useEffect(() => {
    fetchStatuses();
  }, []);

  const pickStatusMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      const uri = result.assets[0].uri;
      const type = result.assets[0].type === 'video' ? 'VIDEO' : 'IMAGE';

      setUploading(true);
      try {
        const fileExt = uri.split('.').pop();
        const path = `${currentUser?.id}/${Date.now()}.${fileExt}`;
        await uploadArrayBufferToBucket({
          bucket: 'statuses',
          path,
          uri,
          contentType: type === 'VIDEO' ? 'video/mp4' : 'image/jpeg'
        });

        await apiRequest('/api/statuses', {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({ mediaUrl: path, type, content: '' })
        });
        fetchStatuses();
      } catch (e) {
        Alert.alert('Erreur', "Impossible de publier le statut.");
      } finally {
        setUploading(false);
      }
    }
  };

  const renderStatusItem = ({ item }: { item: Status }) => (
    <Pressable style={styles.statusCard} onPress={() => setSelectedStatus(item)}>
      <Image source={{ uri: resolvedUrls[item.media_url] || item.profiles.photos[0] }} style={styles.statusPreview} />
      <View style={styles.statusInfo}>
        <Text style={styles.statusName} numberOfLines={1}>{item.profiles.name}</Text>
        {item.message_type === 'VIDEO' && <Play size={12} color="#fff" fill="#fff" />}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><ChevronLeft color={COLORS.ink} /></Pressable>
        <Text style={styles.headerTitle}>Yamo Stories</Text>
        <Pressable onPress={pickStatusMedia} disabled={uploading}>
          {uploading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Plus color={COLORS.primary} />}
        </Pressable>
      </View>

      <FlatList
        data={statuses}
        renderItem={renderStatusItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}><Text style={styles.emptyText}>Aucun statut pour le moment.</Text></View>
        }
      />

      <Modal visible={!!selectedStatus} transparent animationType="fade">
        <View style={styles.modal}>
          <Pressable style={styles.closeModal} onPress={() => setSelectedStatus(null)}><X color="#fff" size={32} /></Pressable>
          {selectedStatus && (
            selectedStatus.message_type === 'VIDEO' ? (
              <VideoPlayer uri={resolvedUrls[selectedStatus.media_url]} style={styles.fullMedia} />
            ) : (
              <Image source={{ uri: resolvedUrls[selectedStatus.media_url] }} style={styles.fullMedia} resizeMode="contain" />
            )
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.ink },
  list: { padding: 10 },
  statusCard: { flex: 1, margin: 5, aspectRatio: 9/16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f1f5f9' },
  statusPreview: { width: '100%', height: '100%' },
  statusInfo: { position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusName: { color: '#fff', fontSize: 12, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  modal: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  closeModal: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullMedia: { width: '100%', height: '80%' },
  empty: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { color: COLORS.muted }
});

export default StatusScreen;
