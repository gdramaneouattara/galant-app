import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import PrimaryButton from '../../../components/PrimaryButton';
import { COLORS } from '../../../data/mock';
import { useApp } from '../../../state/AppContext';

interface PartnerSignupStepProps {
  onBack: () => void;
  onRegister: (data: any) => void;
  loading: boolean;
}

const PartnerSignupStep: React.FC<PartnerSignupStepProps> = ({ onBack, onRegister, loading }) => {
  const { colors, t } = useApp();
  const [partnerForm, setPartnerForm] = useState({
    email: '',
    password: '',
    venueName: '',
    venueType: 'RESTAURANT',
    city: '',
    address: '',
    description: '',
    benefit: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [detectingLocation, setDetectingLocation] = useState(false);

  const detectLocation = async () => {
    try {
      setDetectingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Activez la localisation pour détecter votre position.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setPartnerForm(prev => ({ ...prev, latitude: loc.coords.latitude, longitude: loc.coords.longitude }));

      const [addr] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (addr) {
        setPartnerForm(prev => ({
          ...prev,
          city: addr.city || addr.region || '',
          address: `${addr.name || ''} ${addr.street || ''}, ${addr.city || ''}`.trim()
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
      <Pressable onPress={onBack} style={styles.topBackButton}>
        <ChevronLeft color={colors.textMuted} size={32} />
      </Pressable>

      <Text style={[styles.title, { color: colors.text }]}>Devenir Partenaire Galant</Text>
      <Text style={[styles.caption, { color: colors.textMuted }]}>Rejoignez le guide des lieux les plus chics et proposez des avantages exclusifs à nos membres.</Text>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Informations d'accès</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
          placeholder="Email professionnel"
          placeholderTextColor={colors.textMuted}
          value={partnerForm.email}
          onChangeText={(v) => setPartnerForm({ ...partnerForm, email: v })}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, { marginTop: 10, backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
          placeholder="Mot de passe"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={partnerForm.password}
          onChangeText={(v) => setPartnerForm({ ...partnerForm, password: v })}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Nom de l'établissement</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
          placeholder="Ex: Le Select"
          placeholderTextColor={colors.textMuted}
          value={partnerForm.venueName}
          onChangeText={(v) => setPartnerForm({ ...partnerForm, venueName: v })}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Localisation</Text>
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
              {partnerForm.latitude ? `Coordonnées capturées ✓` : 'Recommandé'}
            </Text>
          </View>
          {detectingLocation && <ActivityIndicator size="small" color={COLORS.primary} />}
        </Pressable>

        <TextInput
          style={[styles.input, { marginTop: 10, backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
          placeholder="Ville"
          placeholderTextColor={colors.textMuted}
          value={partnerForm.city}
          onChangeText={(v) => setPartnerForm({ ...partnerForm, city: v })}
        />
        <TextInput
          style={[styles.input, { marginTop: 10, backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
          placeholder="Adresse complète"
          placeholderTextColor={colors.textMuted}
          value={partnerForm.address}
          onChangeText={(v) => setPartnerForm({ ...partnerForm, address: v })}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Avantage Galant 🎁</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
          placeholder="Ex: Un cocktail de bienvenue offert"
          placeholderTextColor={colors.textMuted}
          value={partnerForm.benefit}
          onChangeText={(v) => setPartnerForm({ ...partnerForm, benefit: v })}
        />
      </View>

      <PrimaryButton
        label="Envoyer ma demande"
        onPress={() => onRegister(partnerForm)}
        loading={loading}
        disabled={!partnerForm.email || !partnerForm.password || !partnerForm.venueName || !partnerForm.city}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 40,
    gap: 18,
  },
  topBackButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  caption: {
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 10,
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    borderRadius: 16,
    minHeight: 52,
    padding: 14,
    borderWidth: 1,
    fontSize: 16,
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
});

export default PartnerSignupStep;
