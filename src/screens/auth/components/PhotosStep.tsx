import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import PrimaryButton from '../../../components/PrimaryButton';
import { COLORS } from '../../../data/mock';
import { useApp } from '../../../state/AppContext';

interface SelectedPhoto {
  previewUri: string;
  uploadUri: string;
  contentType: string;
  fileExtension: string;
}

interface PhotosStepProps {
  form: any;
  setForm: (form: any) => void;
  onNext: () => void;
}

const buildSelectedPhoto = (asset: ImagePicker.ImagePickerAsset | null | undefined): SelectedPhoto | null => {
  if (!asset) return null;
  const mimeType = asset.base64 ? 'image/jpeg' : (asset.mimeType || 'image/jpeg');
  const normalizedExtension = mimeType === 'image/png' ? 'png' : 'jpg';
  const dataUri = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : null;
  const previewUri = asset.uri || dataUri;
  if (!previewUri) return null;
  return {
    previewUri,
    uploadUri: dataUri || previewUri,
    contentType: mimeType,
    fileExtension: normalizedExtension,
  };
};

const PhotosStep: React.FC<PhotosStepProps> = ({ form, setForm, onNext }) => {
  const { colors } = useApp();

  const pickImage = async (slot: number) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la galerie pour continuer.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: false,
      base64: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const selectedPhoto = buildSelectedPhoto(result.assets[0]);
      if (selectedPhoto) {
        setForm((prev: any) => {
          const nextPhotos = [...prev.photos];
          if (slot < nextPhotos.length) nextPhotos[slot] = selectedPhoto;
          else if (nextPhotos.length < 6) nextPhotos.push(selectedPhoto);
          return { ...prev, photos: nextPhotos.slice(0, 6) };
        });
      }
    }
  };

  const removePhoto = (slot: number) => {
    setForm((prev: any) => ({
      ...prev,
      photos: prev.photos.filter((_: any, index: number) => index !== slot),
    }));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Ajoute tes plus belles photos</Text>
      <Text style={[styles.caption, { color: colors.textMuted }]}>Ajoute entre 3 et 6 photos pour activer ton profil.</Text>
      <View style={styles.photoGrid}>
        {[0, 1, 2, 3, 4, 5].map((slot) => {
          const photo = form.photos[slot];
          return (
            <Pressable
              key={slot}
              onPress={() => void pickImage(slot)}
              onLongPress={() => photo ? removePhoto(slot) : undefined}
              style={[styles.photoSlot, { backgroundColor: colors.input, borderColor: colors.border }]}
            >
              {photo ? (
                <Image source={{ uri: photo.previewUri }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera color={colors.textMuted} size={28} />
                  <Text style={[styles.photoText, { color: colors.textMuted }]}>Ajouter</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.caption, { color: colors.textMuted, marginTop: 10 }]}>Photos: {form.photos.length}/6 (minimum 3)</Text>
      <PrimaryButton label="Continuer" onPress={onNext} disabled={form.photos.length < 3} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  caption: {
    fontSize: 14,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoSlot: {
    width: '47%',
    aspectRatio: 3 / 4,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PhotosStep;
