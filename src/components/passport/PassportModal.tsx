import React, { useState, useRef, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, FlatList, ActivityIndicator, Alert, Animated, Dimensions } from 'react-native';
import { X, MapPin, Globe, Search, Plane } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import * as Location from 'expo-location';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

const PassportModal: React.FC<Props> = ({ visible, onClose }) => {
  const { currentUser, updateCurrentUser, colors, t } = useApp();
  const [query, setQuery] = useState('');
  const [results, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const planeAnim = useRef(new Animated.Value(-100)).current;
  const planeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      planeAnim.setValue(-100);
      planeOpacity.setValue(0);
    }
  }, [visible]);

  const searchCity = async () => {
    const cityQuery = (query || '').trim();
    if (!cityQuery) return;
    try {
      setLoading(true);
      const res = await Location.geocodeAsync(cityQuery);
      if (res.length > 0) {
        const addr = await Location.reverseGeocodeAsync({
          latitude: res[0].latitude,
          longitude: res[0].longitude
        });
        setProfiles([{
          city: addr[0].city || addr[0].region || query,
          country: addr[0].country || '',
          latitude: res[0].latitude,
          longitude: res[0].longitude
        }]);
      } else {
        Alert.alert(t('error'), t('no_venue_found'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCity = async (city: any) => {
    try {
      setUpdating(true);

      // Trigger Plane Animation
      Animated.sequence([
        Animated.timing(planeOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(planeAnim, { toValue: width + 100, duration: 1200, useNativeDriver: true }),
      ]).start();

      await apiRequest('/api/profiles/update', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          passport_city: city.city,
          passport_country: city.country,
          passport_latitude: city.latitude,
          passport_longitude: city.longitude,
          is_passport_active: true
        })
      });

      await updateCurrentUser({
        passport_city: city.city,
        passport_country: city.country,
        passport_latitude: city.latitude,
        passport_longitude: city.longitude
      } as any);

      // Brief delay to let the plane finish its flight
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setUpdating(false);
    }
  };

  const deactivatePassport = async () => {
    try {
      setUpdating(true);
      await apiRequest('/api/profiles/update', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ is_passport_active: false })
      });
      await updateCurrentUser({
        passport_city: null,
        passport_country: null,
        passport_latitude: null,
        passport_longitude: null
      } as any);
      onClose();
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.card }]}>

          <Animated.View style={[styles.planeContainer, { opacity: planeOpacity, transform: [{ translateX: planeAnim }] }]}>
            <Plane size={40} color="#e11d48" fill="#fff1f2" />
          </Animated.View>

          <View style={styles.header}>
            <View style={styles.headerIconWrap}><Plane size={24} color="#e11d48" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>{t('passport_galant')}</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('passport_desc')}</Text>
            </View>
            <Pressable onPress={onClose}><X size={24} color={colors.textMuted} /></Pressable>
          </View>

          <View style={styles.benefitsRow}>
             <View style={styles.benefit}><Text style={[styles.benefitText, { color: colors.text }]}>{t('passport_benefit_1')}</Text></View>
             <View style={styles.benefit}><Text style={[styles.benefitText, { color: colors.text }]}>{t('passport_benefit_2')}</Text></View>
             <View style={styles.benefit}><Text style={[styles.benefitText, { color: colors.text }]}>{t('passport_benefit_3')}</Text></View>
          </View>

          <View style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t('search_city')}
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={searchCity}
            />
            {loading && <ActivityIndicator size="small" color="#e11d48" />}
          </View>

          <FlatList
            data={results}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.resultRow, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectCity(item)}
                disabled={updating}
              >
                <MapPin size={18} color="#e11d48" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cityName, { color: colors.text }]}>{item.city}</Text>
                  <Text style={[styles.countryName, { color: colors.textMuted }]}>{item.country}</Text>
                </View>
                <Text style={styles.selectBtn}>{t('select_city')}</Text>
              </Pressable>
            )}
            style={{ maxHeight: 200 }}
          />

          {currentUser?.passport_city && (
            <Pressable
              style={[styles.deactivateBtn, { borderColor: colors.border }]}
              onPress={deactivatePassport}
              disabled={updating}
            >
              <Globe size={18} color={colors.textMuted} />
              <Text style={[styles.deactivateText, { color: colors.text }]}>{t('deactivate_passport')}</Text>
            </Pressable>
          )}

          {updating && <ActivityIndicator color="#e11d48" style={{ marginTop: 10 }} />}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  planeContainer: { position: 'absolute', top: '30%', left: 0, zIndex: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  headerIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900' },
  subtitle: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  benefitsRow: { marginBottom: 24, gap: 8 },
  benefit: { backgroundColor: 'rgba(225, 29, 72, 0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  benefitText: { fontSize: 12, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 54, borderRadius: 16, borderWidth: 1, gap: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: '600' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1 },
  cityName: { fontSize: 16, fontWeight: '700' },
  countryName: { fontSize: 13, marginTop: 2 },
  selectBtn: { color: '#e11d48', fontWeight: '800', fontSize: 13 },
  deactivateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, borderWidth: 1, marginTop: 16, borderStyle: 'dashed' },
  deactivateText: { fontWeight: '700', fontSize: 14 },
});

export default PassportModal;
