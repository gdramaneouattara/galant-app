import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';
import PrimaryButton from '../../../components/PrimaryButton';
import { COLORS } from '../../../data/mock';
import { useApp } from '../../../state/AppContext';

interface LocationStepProps {
  form: any;
  setForm: (form: any) => void;
  onComplete: () => void;
  loading: boolean;
}

const LocationStep: React.FC<LocationStepProps> = ({ form, setForm, onComplete, loading }) => {
  const { colors } = useApp();
  const [detectingLocation, setDetectingLocation] = useState(false);

  const detectLocation = async () => {
    try {
      setDetectingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Activez la localisation pour vous proposer des profils proches de vous.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setForm((prev: any) => ({
        ...prev,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      }));

      const [addr] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });
      if (addr) {
        setForm((prev: any) => ({
          ...prev,
          city: addr.city || addr.region || '',
          country: addr.country || ''
        }));
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de détecter votre position.');
    } finally {
      setDetectingLocation(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Localisation</Text>
      <Text style={[styles.caption, { color: colors.textMuted }]}>L'accès à votre position est indispensable pour vous proposer des profils proches de vous avec élégance.</Text>
      <Pressable
        style={[styles.locationCard, { backgroundColor: colors.card, borderColor: form.latitude ? '#22c55e' : colors.border }]}
        onPress={detectLocation}
        disabled={detectingLocation}
      >
        <MapPin color={form.latitude ? '#22c55e' : COLORS.primary} size={24} />
        <View style={styles.locationCopy}>
          <Text style={[styles.locationTitle, { color: colors.text }]}>
            {detectingLocation ? 'Détection en cours...' : 'Détecter ma position GPS'}
          </Text>
          <Text style={[styles.locationSubtitle, { color: form.latitude ? '#22c55e' : colors.textMuted }]}>
            {form.latitude ? `Position capturée : ${form.city} ✓` : 'Appuyez pour activer'}
          </Text>
        </View>
        {detectingLocation && <ActivityIndicator size="small" color={COLORS.primary} />}
      </Pressable>

      <View style={{ marginTop: 20 }}>
        <PrimaryButton
          label="Terminer"
          onPress={onComplete}
          loading={loading}
          disabled={!form.latitude}
        />
      </View>
      {!form.latitude && (
        <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>
          Vous devez activer la localisation pour continuer.
        </Text>
      )}
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
  locationCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationCopy: {
    gap: 4,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  locationSubtitle: {
    fontSize: 12,
  },
  input: {
    borderRadius: 16,
    minHeight: 52,
    padding: 14,
    borderWidth: 1,
    fontSize: 16,
  },
});

export default LocationStep;
