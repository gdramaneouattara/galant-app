import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, Crown, Gem, MapPin, Rocket, Shield, ShieldCheck } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../state/AppContext';

const APPS = [
  {
    id: 'sorties',
    title: 'Sorties',
    subtitle: 'Agenda, lieux et idees de rendez-vous',
    icon: Calendar,
    color: '#0ea5e9',
    route: 'AgendaTab',
    tab: true,
  },
  {
    id: 'guide',
    title: 'Guide Galant',
    subtitle: 'Les adresses utiles pour vos rencontres',
    icon: MapPin,
    color: '#e11d48',
    route: 'Guide',
  },
  {
    id: 'premium',
    title: 'Premium',
    subtitle: 'IA, mode invisible et avantages exclusifs',
    icon: Crown,
    color: '#f59e0b',
    route: 'Premium',
  },
  {
    id: 'boost',
    title: 'Boost',
    subtitle: 'Gagnez plus de visibilite dans Decouverte',
    icon: Rocket,
    color: '#7c3aed',
    route: 'Boost',
  },
  {
    id: 'sentinel',
    title: 'La Sentinelle',
    subtitle: 'Securite privee et appel fantome discret',
    icon: Shield,
    color: '#2563eb',
    route: 'Sentinel',
  },
  {
    id: 'verification',
    title: 'Certification',
    subtitle: 'Verifiez votre identite et inspirez confiance',
    icon: ShieldCheck,
    color: '#2563eb',
    route: 'Verify',
  },
  {
    id: 'roses',
    title: 'Roses',
    subtitle: 'Roses recues, solde et historique',
    icon: Gem,
    color: '#be123c',
    route: 'LikesReceived',
  },
];

const AppsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useApp();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Apps</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Services utiles pour organiser, verifier et booster vos rencontres.
          </Text>
        </View>

        <View style={styles.grid}>
          {APPS.map((item) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.id}
                style={[styles.appCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate(item.route as never)}
              >
                <View style={[styles.iconBox, { backgroundColor: `${item.color}18` }]}>
                  <Icon size={24} color={item.color} />
                </View>
                <Text style={[styles.appTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.appSubtitle, { color: colors.textMuted }]}>{item.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  header: { marginBottom: 20 },
  title: { fontSize: 32, fontFamily: 'PlayfairBlack' },
  subtitle: { marginTop: 6, fontSize: 14, fontFamily: 'InterSemiBold', lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  appCard: { width: '48%', minHeight: 156, borderRadius: 20, borderWidth: 1, padding: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  appTitle: { fontSize: 15, fontFamily: 'InterBold', marginBottom: 6 },
  appSubtitle: { fontSize: 12, fontFamily: 'InterSemiBold', lineHeight: 17 },
});

export default AppsScreen;
