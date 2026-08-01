import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, Crown, Gem, MapPin, Rocket, Shield, ShieldCheck } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../state/AppContext';

const APPS = [
  {
    id: 'partner_discovery',
    titleKey: 'partner_discovery',
    subtitleKey: 'partner_discovery_subtitle',
    fallbackTitle: 'Partenaires autour de moi',
    fallbackSubtitle: 'Restaurants, lounges, hotels et lieux utiles par ville ou geolocalisation.',
    icon: MapPin,
    color: '#e11d48',
    route: 'PartnerDiscovery',
  },
  {
    id: 'sorties',
    titleKey: 'agenda',
    subtitleKey: 'agenda_subtitle',
    icon: Calendar,
    color: '#0ea5e9',
    route: 'AgendaTab',
  },
  {
    id: 'guide',
    titleKey: 'guide',
    subtitleKey: 'guide_subtitle',
    icon: MapPin,
    color: '#e11d48',
    route: 'Guide',
  },
  {
    id: 'premium',
    titleKey: 'premium_join',
    subtitleKey: 'premium_subtitle',
    icon: Crown,
    color: '#f59e0b',
    route: 'Premium',
  },
  {
    id: 'boost',
    titleKey: 'boost_your_profile',
    subtitleKey: 'boost_subtitle',
    icon: Rocket,
    color: '#7c3aed',
    route: 'Boost',
  },
  {
    id: 'sentinel',
    titleKey: 'sentinel',
    subtitleKey: 'sentinel_subtitle',
    icon: Shield,
    color: '#2563eb',
    route: 'Sentinel',
  },
  {
    id: 'verification',
    titleKey: 'verify_identity',
    subtitleKey: 'certified_badge_desc',
    icon: ShieldCheck,
    color: '#2563eb',
    route: 'Verify',
  },
  {
    id: 'roses',
    titleKey: 'rose_box',
    subtitleKey: 'roses',
    icon: Gem,
    color: '#be123c',
    route: 'LikesReceived',
  },
];

const AppsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, t } = useApp();

  const label = (key: string, fallback?: string) => {
    const translated = t(key as any);
    return translated === key ? fallback || key : translated;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('apps')}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t('useful_services_subtitle')}
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
                <Text style={[styles.appTitle, { color: colors.text }]}>{label(item.titleKey, item.fallbackTitle)}</Text>
                <Text style={[styles.appSubtitle, { color: colors.textMuted }]}>{label(item.subtitleKey, item.fallbackSubtitle)}</Text>
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
