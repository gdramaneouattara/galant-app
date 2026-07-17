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
      <Text style={[styles.caption, { color: colors.textMuted }]}>Pour te proposer des profils proches de toi.</Text>
      <Pressable
        style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={detectLocation}
        disabled={detectingLocation}
      >
        <MapPin color={COLORS.primary} size={24} />
        <View style={styles.locationCopy}>
          <Text style={[styles.locationTitle, { color: colors.text }]}>
            {detectingLocation ? 'Détection...' : 'Détecter ma position GPS'}
          </Text>
          <Text style={[styles.locationSubtitle, { color: colors.textMuted }]}>
            {form.latitude ? 'Coordonnées capturées ✓' : form.city}
          </Text>
        </View>
        {detectingLocation && <ActivityIndicator size="small" color={COLORS.primary} />}
      </Pressable>
      <TextInput
        value={form.city}
        onChangeText={(text) => setForm({ ...form, city: text })}
        placeholder="Ville"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text, marginTop: 10 }]}
      />
      <TextInput
        value={form.country}
        onChangeText={(text) => setForm({ ...form, country: text })}
        placeholder="Pays"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text, marginTop: 10 }]}
      />
      <PrimaryButton label="Terminer" onPress={onComplete} loading={loading} />
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
