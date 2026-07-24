import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Lock, Heart, ShieldCheck, Sparkles } from 'lucide-react-native';
import PrimaryButton from '../../../components/PrimaryButton';
import { COLORS } from '../../../data/mock';
import { useApp } from '../../../state/AppContext';

interface ManifestoStepProps {
  onComplete: () => void;
  loading: boolean;
}

const ManifestoStep: React.FC<ManifestoStepProps> = ({ onComplete, loading }) => {
  const { colors } = useApp();

  const pillars = [
    {
      title: "Discrétion Absolue",
      desc: "Ce qui se passe dans le Cercle reste dans le Cercle. La vie privée de nos membres est sacrée.",
      icon: Lock
    },
    {
      title: "Respect & Courtoisie",
      desc: "La galanterie n'est pas une option, c'est notre langage commun. Chaque échange doit être empreint d'élégance.",
      icon: Heart
    },
    {
      title: "Authenticité",
      desc: "Votre vérité fait votre rayonnement. Seuls les profils sincère font la force de Galant.",
      icon: ShieldCheck
    }
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Le Manifeste</Text>
        <Text style={styles.badge}>CONTRAT DE PRESTIGE</Text>
      </View>

      <View style={styles.pillars}>
        {pillars.map((item, i) => (
          <View key={i} style={styles.pillarItem}>
            <View style={[styles.iconWrap, { backgroundColor: colors.input }]}>
              <item.icon size={24} color={COLORS.primary} />
            </View>
            <View style={styles.pillarContent}>
              <Text style={[styles.pillarTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.pillarDesc, { color: colors.textMuted }]}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.notice, { backgroundColor: colors.input }]}>
        <Text style={styles.noticeText}>
          En rejoignant Galant, vous vous engagez à porter haut les valeurs de distinction et de bienveillance.
        </Text>
      </View>

      <PrimaryButton
        label="J'ADHÈRE AUX VALEURS"
        onPress={onComplete}
        loading={loading}
        icon={<Sparkles size={18} color="#fff" />}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  badge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#b45309',
    letterSpacing: 2,
  },
  pillars: {
    gap: 24,
  },
  pillarItem: {
    flexDirection: 'row',
    gap: 16,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarContent: {
    flex: 1,
    gap: 4,
  },
  pillarTitle: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pillarDesc: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  notice: {
    padding: 16,
    borderRadius: 20,
  },
  noticeText: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '700',
    color: '#92400e',
    lineHeight: 16,
  },
});

export default ManifestoStep;
