import React from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Camera, Trash2 } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface VenueGalleryProps {
  photos: string[];
  onAddPhoto: () => void;
  onRemovePhoto: (photo: string) => void;
  uploading: boolean;
  colors: any;
}

const VenueGallery: React.FC<VenueGalleryProps> = ({
  photos,
  onAddPhoto,
  onRemovePhoto,
  uploading,
  colors,
}) => {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Galerie Photos ({photos.length}/6)
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
        {photos.map((photo, idx) => (
          <View key={idx} style={styles.galleryItem}>
            <Image source={{ uri: photo }} style={styles.galleryImage} />
            <Pressable style={styles.removePhotoBtn} onPress={() => onRemovePhoto(photo)}>
              <Trash2 size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
        {photos.length < 6 && (
          <Pressable
            style={[styles.addPhotoCard, { backgroundColor: colors.input, borderColor: colors.border }]}
            onPress={onAddPhoto}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Camera size={24} color={colors.textMuted} />
            )}
            <Text style={[styles.addPhotoText, { color: colors.textMuted }]}>Ajouter</Text>
          </Pressable>
        )}
      </ScrollView>
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
  galleryRow: {
    gap: 12,
  },
  galleryItem: {
    width: 120,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoCard: {
    width: 120,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

export default VenueGallery;
