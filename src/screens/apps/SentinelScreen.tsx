import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Clock, Phone, PhoneIncoming, Shield, User, X } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';

const DELAYS_MINUTES = [0, 1, 2, 5];

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
};

const SentinelScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, activeTheme, t } = useApp();
  const isDark = activeTheme === 'dark';
  const [callerName, setCallerName] = useState('Bureau');
  const [fakeCallDelay, setFakeCallDelay] = useState(0);
  const [isFakeCallScheduled, setIsFakeCallScheduled] = useState(false);
  const [scheduledSecondsLeft, setScheduledSecondsLeft] = useState<number | null>(null);
  const [isFakeCallActive, setIsFakeCallActive] = useState(false);
  const [isFakeCallRinging, setIsFakeCallRinging] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRingtone = useCallback(() => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    Vibration.cancel();
  }, []);

  const playRingtonePulse = useCallback(() => {
    Vibration.vibrate([0, 700, 250, 700]);
  }, []);

  const startRingtone = useCallback(() => {
    stopRingtone();
    playRingtonePulse();
    ringIntervalRef.current = setInterval(playRingtonePulse, 1800);
  }, [playRingtonePulse, stopRingtone]);

  const triggerFakeCall = useCallback(() => {
    setIsFakeCallActive(true);
    setIsFakeCallRinging(true);
    setCallDuration(0);
    startRingtone();
  }, [startRingtone]);

  const acceptCall = useCallback(() => {
    setIsFakeCallRinging(false);
    stopRingtone();
  }, [stopRingtone]);

  const endCall = useCallback(() => {
    setIsFakeCallActive(false);
    setIsFakeCallRinging(false);
    setCallDuration(0);
    stopRingtone();
  }, [stopRingtone]);

  useEffect(() => {
    if (!isFakeCallScheduled || scheduledSecondsLeft === null || scheduledSecondsLeft <= 0) return;

    const interval = setInterval(() => {
      setScheduledSecondsLeft((previous) => {
        if (previous === null) return null;
        const next = previous - 1;
        if (next === 5) {
          Vibration.vibrate([0, 120, 80, 120]);
        }
        if (next <= 0) {
          clearInterval(interval);
          setIsFakeCallScheduled(false);
          triggerFakeCall();
          return null;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isFakeCallScheduled, scheduledSecondsLeft, triggerFakeCall]);

  useEffect(() => {
    if (!isFakeCallActive || isFakeCallRinging) return;

    const interval = setInterval(() => {
      setCallDuration((value) => value + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isFakeCallActive, isFakeCallRinging]);

  useEffect(() => {
    if (!isFakeCallActive) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      endCall();
      return true;
    });

    return () => subscription.remove();
  }, [endCall, isFakeCallActive]);

  useEffect(() => {
    return () => {
      stopRingtone();
      setIsFakeCallScheduled(false);
    };
  }, [stopRingtone]);

  const scheduleOrStartCall = () => {
    if (fakeCallDelay === 0) {
      triggerFakeCall();
      return;
    }

    setScheduledSecondsLeft(fakeCallDelay * 60);
    setIsFakeCallScheduled(true);
  };

  const cancelScheduledCall = () => {
    setIsFakeCallScheduled(false);
    setScheduledSecondsLeft(null);
    Vibration.cancel();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>{t('sentinel')}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('sentinel_page_subtitle')}</Text>
          </View>
        </View>

        <View style={[styles.hero, { backgroundColor: isDark ? '#0f172a' : '#fff', borderColor: colors.border }]}>
          <View style={styles.heroIcon}>
            <Shield size={28} color="#fff" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>{t('fake_call')}</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              {t('fake_call_subtitle')}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Clock size={18} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('when_ring')}</Text>
          </View>

          <View style={styles.delayGrid}>
            {DELAYS_MINUTES.map((delay) => {
              const selected = fakeCallDelay === delay;
              return (
                <Pressable
                  key={delay}
                  onPress={() => setFakeCallDelay(delay)}
                  style={[
                    styles.delayButton,
                    { borderColor: selected ? COLORS.primary : colors.border },
                    selected && styles.delayButtonActive,
                  ]}
                >
                  <Text style={[styles.delayText, { color: selected ? '#fff' : colors.text }]}>
                    {delay === 0 ? t('immediate') : `${delay} min`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.inputBlock}>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t('caller_display_name')}</Text>
            <TextInput
              value={callerName}
              onChangeText={setCallerName}
              placeholder={t('caller_placeholder')}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#020617' : '#f8fafc',
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              maxLength={32}
            />
          </View>

          {!isFakeCallScheduled ? (
            <Pressable style={styles.primaryButton} onPress={scheduleOrStartCall}>
              <PhoneIncoming size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {fakeCallDelay === 0 ? t('start_simulation') : t('schedule_call')}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.scheduledBox}>
              <Text style={styles.scheduledLabel}>{t('scheduled_call')}</Text>
              <Text style={styles.scheduledTime}>{formatDuration(scheduledSecondsLeft || 0)}</Text>
              <Pressable style={styles.cancelButton} onPress={cancelScheduledCall}>
                <X size={16} color="#fecaca" />
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={[styles.note, { backgroundColor: isDark ? '#111827' : '#fff7ed', borderColor: isDark ? '#374151' : '#fed7aa' }]}>
          <Text style={[styles.noteText, { color: isDark ? '#fed7aa' : '#9a3412' }]}>
            {t('call_sound_note')}
          </Text>
        </View>
      </ScrollView>

      <Modal visible={isFakeCallActive} animationType="fade" statusBarTranslucent onRequestClose={endCall}>
        <View style={styles.callOverlay}>
          <View style={styles.callIdentity}>
            <View style={styles.avatar}>
              <User size={52} color="#94a3b8" />
            </View>
            <Text style={styles.callerName}>{callerName.trim() || 'Bureau'}</Text>
            <Text style={styles.callStatus}>
              {isFakeCallRinging ? t('incoming_call') : formatDuration(callDuration)}
            </Text>
          </View>

          <View style={styles.callActions}>
            {isFakeCallRinging ? (
              <>
                <Pressable style={styles.callAction} onPress={endCall}>
                  <View style={[styles.callButton, styles.rejectButton]}>
                    <Phone size={28} color="#fff" style={styles.hangupIcon} />
                  </View>
                  <Text style={styles.callActionLabel}>{t('decline')}</Text>
                </Pressable>
                <Pressable style={styles.callAction} onPress={acceptCall}>
                  <View style={[styles.callButton, styles.acceptButton]}>
                    <Phone size={28} color="#fff" />
                  </View>
                  <Text style={styles.callActionLabel}>{t('accept')}</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.callAction} onPress={endCall}>
                <View style={[styles.callButton, styles.rejectButton]}>
                  <Phone size={28} color="#fff" style={styles.hangupIcon} />
                </View>
                <Text style={styles.callActionLabel}>{t('hang_up')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 },
  backButton: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: 30, fontFamily: 'PlayfairBlack' },
  subtitle: { marginTop: 4, fontSize: 12, fontFamily: 'InterBold', textTransform: 'uppercase', letterSpacing: 0 },
  hero: { borderWidth: 1, borderRadius: 24, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 14 },
  heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 20, fontFamily: 'PlayfairBlack' },
  heroSubtitle: { marginTop: 4, fontSize: 13, fontFamily: 'InterSemiBold', lineHeight: 19 },
  card: { borderWidth: 1, borderRadius: 24, padding: 18, gap: 18 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 14, fontFamily: 'InterBold', textTransform: 'uppercase' },
  delayGrid: { flexDirection: 'row', gap: 8 },
  delayButton: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  delayButtonActive: { backgroundColor: COLORS.primary },
  delayText: { fontSize: 12, fontFamily: 'InterBold' },
  inputBlock: { gap: 8 },
  label: { fontSize: 11, fontFamily: 'InterBold', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'InterSemiBold' },
  primaryButton: { minHeight: 54, borderRadius: 18, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontFamily: 'InterBold', textTransform: 'uppercase' },
  scheduledBox: { borderRadius: 20, padding: 16, backgroundColor: '#450a0a', alignItems: 'center', gap: 8 },
  scheduledLabel: { color: '#fecaca', fontSize: 11, fontFamily: 'InterBold', textTransform: 'uppercase' },
  scheduledTime: { color: '#fff', fontSize: 34, fontFamily: 'InterBold' },
  cancelButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  cancelButtonText: { color: '#fecaca', fontSize: 12, fontFamily: 'InterBold', textTransform: 'uppercase' },
  note: { borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 14 },
  noteText: { fontSize: 12, fontFamily: 'InterSemiBold', lineHeight: 18 },
  callOverlay: { flex: 1, backgroundColor: '#020617', justifyContent: 'space-between', paddingHorizontal: 36, paddingTop: 110, paddingBottom: 70 },
  callIdentity: { alignItems: 'center' },
  avatar: { width: 108, height: 108, borderRadius: 54, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#1e293b', marginBottom: 24 },
  callerName: { color: '#fff', fontSize: 31, fontFamily: 'InterSemiBold', textAlign: 'center' },
  callStatus: { marginTop: 10, color: '#94a3b8', fontSize: 15, fontFamily: 'InterSemiBold' },
  callActions: { minHeight: 108, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  callAction: { alignItems: 'center', gap: 12, minWidth: 110 },
  callButton: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  rejectButton: { backgroundColor: '#ef4444' },
  acceptButton: { backgroundColor: '#22c55e' },
  hangupIcon: { transform: [{ rotate: '135deg' }] },
  callActionLabel: { color: '#cbd5e1', fontSize: 11, fontFamily: 'InterBold', textTransform: 'uppercase' },
});

export default SentinelScreen;
