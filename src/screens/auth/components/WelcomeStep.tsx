import React from 'react';
import { View, Text, Image, ImageBackground, Pressable, StyleSheet } from 'react-native';
import { Languages } from 'lucide-react-native';
import PrimaryButton from '../../../components/PrimaryButton';
import { useApp } from '../../../state/AppContext';

interface WelcomeStepProps {
  onGoTo: (step: any) => void;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onGoTo }) => {
  const { t, language, setLanguage } = useApp();

  return (
    <ImageBackground source={require('../../../../assets/auth-bg.png')} style={styles.welcome}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
          style={styles.langBtn}
        >
          <Languages size={18} color="#fff" />
          <Text style={styles.langText}>{String(language).toUpperCase()}</Text>
        </Pressable>
      </View>

      <View style={styles.welcomeTop}>
        <Image source={require('../../../../assets/icon (2).png')} style={styles.logoImage} />
        <Text style={styles.brand}>Galant</Text>
        <Text style={styles.subtitle}>{t('welcome_subtitle')}</Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton label={t('create_account')} onPress={() => onGoTo('signup')} />
        <Pressable
          style={styles.secondaryButton}
          onPress={() => onGoTo('login')}
          accessibilityRole="button"
          accessibilityLabel={t('login')}
        >
          <Text style={styles.secondaryLabel}>{t('login')}</Text>
        </Pressable>

        <Pressable
          style={styles.partnerSignupBtn}
          onPress={() => onGoTo('partner_signup')}
        >
          <Text style={styles.partnerSignupBtnText}>{t('partner_signup')}</Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  welcome: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 32,
  },
  welcomeTop: {
    alignItems: 'center',
    marginTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 10,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  langText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 25,
    marginBottom: 20,
  },
  brand: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
  },
  subtitle: {
    color: '#f8fafc',
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  actions: {
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  partnerSignupBtn: {
    marginTop: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  partnerSignupBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
    opacity: 0.9,
  },
});

export default WelcomeStep;
