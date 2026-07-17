import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  Trophy, Sparkles, ChevronRight, Settings, EyeOff, ShieldCheck,
  Crown, Rocket, LogOut
} from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface ProfileMenuProps {
  currentUser: any;
  currentGoalLabel: string;
  currentGoalIcon: any;
  invisibleModeEnabled: boolean;
  isTogglingInvisible: boolean;
  invisibleModeDescription: string;
  isInvisibleEligible: boolean;
  exportingData: boolean;
  deletingAccount: boolean;
  onOpenDiscover: () => void;
  onOpenBio: () => void;
  onOpenGoal: () => void;
  onOpenSettings: () => void;
  onToggleInvisible: (enabled: boolean) => void;
  onVerify: () => void;
  onGoPremium: () => void;
  onOpenLikes: () => void;
  onOpenBoost: () => void;
  onExportData: () => void;
  onDeleteAccount: () => void;
  onShareInvite: () => void;
  onLogout: () => void;
  colors: any;
  activeTheme: string;
  t: (key: any, params?: any) => string;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  currentUser,
  currentGoalLabel,
  currentGoalIcon,
  invisibleModeEnabled,
  isTogglingInvisible,
  invisibleModeDescription,
  isInvisibleEligible,
  exportingData,
  deletingAccount,
  onOpenDiscover,
  onOpenBio,
  onOpenGoal,
  onOpenSettings,
  onToggleInvisible,
  onVerify,
  onGoPremium,
  onOpenLikes,
  onOpenBoost,
  onExportData,
  onDeleteAccount,
  onShareInvite,
  onLogout,
  colors,
  activeTheme,
  t,
}) => {
  return (
    <View style={styles.section}>
      <Pressable
        style={[styles.row, styles.rowInvite, { backgroundColor: activeTheme === 'dark' ? '#020617' : '#0f172a', borderColor: activeTheme === 'dark' ? '#1e293b' : '#1e293b' }]}
        onPress={onShareInvite}
      >
        <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={{ fontSize: 18 }}>🎁</Text>
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, { color: '#fff' }]}>Inviter un Ami 🌹</Text>
          <Text style={[styles.rowSubLabel, { color: '#94a3b8' }]}>Gagnez des Roses d'Or</Text>
        </View>
        <ChevronRight size={18} color="#475569" />
      </Pressable>

      <Pressable style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onOpenDiscover}>
        <View style={[styles.rowIcon, { backgroundColor: colors.input }]}>
          <Trophy size={18} color={colors.textMuted} />
        </View>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{t('discover')}</Text>
        <ChevronRight size={18} color={colors.border} />
      </Pressable>

      <Pressable style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onOpenBio}>
        <View style={[styles.rowIcon, { backgroundColor: activeTheme === 'dark' ? '#4c0519' : '#fff1f2' }]}>
          <Sparkles size={18} color="#e11d48" />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>{t('my_bio')}</Text>
          <Text style={[styles.rowSubLabel, { color: colors.textMuted }]} numberOfLines={1}>
            {currentUser.bio || '...'}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.border} />
      </Pressable>

      <Pressable style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onOpenGoal}>
        <View style={[styles.rowIcon, { backgroundColor: activeTheme === 'dark' ? '#450a0a' : '#fef2f2' }]}>
          {currentGoalIcon({ size: 18, color: COLORS.primary })}
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>{t('i_am_looking_for')}</Text>
          <Text style={[styles.rowSubLabel, { color: colors.textMuted }]}>{currentGoalLabel}</Text>
        </View>
        <ChevronRight size={18} color={colors.border} />
      </Pressable>

      <Pressable style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onOpenSettings}>
        <View style={[styles.rowIcon, { backgroundColor: colors.input }]}>
          <Settings size={18} color={colors.textMuted} />
        </View>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings')}</Text>
        <ChevronRight size={18} color={colors.border} />
      </Pressable>

      {isInvisibleEligible ? (
        <Pressable
          style={[styles.row, styles.rowInvisible, { backgroundColor: activeTheme === 'dark' ? '#042f2e' : '#f0fdfa', borderColor: activeTheme === 'dark' ? '#134e4a' : '#ccfbf1' }]}
          onPress={() => onToggleInvisible(!invisibleModeEnabled)}
          disabled={isTogglingInvisible}
        >
          <View style={[styles.rowIcon, { backgroundColor: colors.card }]}>
            <EyeOff size={18} color="#0f766e" />
          </View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{t('invisible_mode_title')}</Text>
            <Text style={[styles.rowSubLabel, { color: colors.textMuted }]}>{invisibleModeDescription}</Text>
          </View>
          {isTogglingInvisible ? (
            <Text style={[styles.rowStatus, { color: colors.textMuted }]}>...</Text>
          ) : (
            <View style={[styles.rowStatusPill, invisibleModeEnabled && styles.rowStatusPillActive, invisibleModeEnabled && activeTheme === 'dark' && { backgroundColor: '#134e4a', borderColor: '#065f46' }]}>
              <Text style={[styles.rowStatusPillText, invisibleModeEnabled && styles.rowStatusPillTextActive, invisibleModeEnabled && activeTheme === 'dark' && { color: '#2dd4bf' }]}>
                {invisibleModeEnabled ? t('active') : t('inactive')}
              </Text>
            </View>
          )}
        </Pressable>
      ) : (
        <Pressable style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onGoPremium}>
          <View style={[styles.rowIcon, { backgroundColor: colors.card }]}>
            <EyeOff size={18} color={colors.textMuted} />
          </View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{t('invisible_mode_title')}</Text>
            <Text style={[styles.rowSubLabel, { color: colors.textMuted }]}>{invisibleModeDescription}</Text>
          </View>
          <ChevronRight size={18} color={colors.border} />
        </Pressable>
      )}

      {!currentUser.isVerified && (
        <Pressable style={[styles.row, styles.rowVerify, { backgroundColor: activeTheme === 'dark' ? '#172554' : '#eff6ff', borderColor: activeTheme === 'dark' ? '#1e3a8a' : '#dbeafe' }]} onPress={onVerify}>
          <View style={[styles.rowIcon, { backgroundColor: colors.card }]}>
            <ShieldCheck size={18} color="#2563eb" />
          </View>
          <Text style={[styles.rowLabel, styles.rowLabelVerify]}>{t('verify_identity')}</Text>
          <ChevronRight size={18} color="#93c5fd" />
        </Pressable>
      )}

      {!currentUser.isPremium && (
        <Pressable style={[styles.row, styles.rowPremium, { backgroundColor: activeTheme === 'dark' ? '#451a03' : '#fffbeb', borderColor: activeTheme === 'dark' ? '#78350f' : '#fef3c7' }]} onPress={onGoPremium}>
          <View style={[styles.rowIcon, { backgroundColor: colors.card }]}>
            <Crown size={18} color="#d97706" />
          </View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>{t('become_premium')}</Text>
          <ChevronRight size={18} color="#facc15" />
        </Pressable>
      )}

      <Pressable style={[styles.row, styles.rowLikes, { backgroundColor: activeTheme === 'dark' ? '#4c0519' : '#fff1f2', borderColor: activeTheme === 'dark' ? '#881337' : '#ffe4e6' }]} onPress={onOpenLikes}>
        <View style={[styles.rowIcon, { backgroundColor: colors.card }]}>
          <Text style={{ fontSize: 18 }}>🌹</Text>
        </View>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{t('rose_box')}</Text>
        <ChevronRight size={18} color="#fda4af" />
      </Pressable>

      <Pressable style={[styles.row, styles.rowBoost, { backgroundColor: activeTheme === 'dark' ? '#2e1065' : '#f5f3ff', borderColor: activeTheme === 'dark' ? '#4c1d95' : '#ede9fe' }]} onPress={onOpenBoost}>
        <View style={[styles.rowIcon, { backgroundColor: colors.card }]}>
          <Rocket size={18} color="#8b5cf6" />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>{t('boosts')}</Text>
        </View>
        <ChevronRight size={18} color="#c4b5fd" />
      </Pressable>

      <Pressable
        style={[styles.row, styles.rowPrivacy, { backgroundColor: activeTheme === 'dark' ? '#082f49' : '#f0f9ff', borderColor: activeTheme === 'dark' ? '#0c4a6e' : '#bae6fd' }]}
        onPress={onExportData}
        disabled={exportingData}
      >
        <View style={[styles.rowIcon, { backgroundColor: colors.card }]}>
          <ShieldCheck size={18} color="#0369a1" />
        </View>
        <Text style={[styles.rowLabel, { color: colors.text }]}>
          {exportingData ? '...' : t('download_my_data')}
        </Text>
        <ChevronRight size={18} color="#7dd3fc" />
      </Pressable>

      <Pressable style={[styles.row, styles.rowPrivacyDelete, { backgroundColor: activeTheme === 'dark' ? '#4c0519' : '#fff1f2', borderColor: activeTheme === 'dark' ? '#881337' : '#fecdd3' }]} onPress={onDeleteAccount} disabled={deletingAccount}>
        <View style={[styles.rowIcon, { backgroundColor: colors.card }]}>
          <LogOut size={18} color="#b91c1c" />
        </View>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{deletingAccount ? '...' : t('delete_my_account')}</Text>
        <ChevronRight size={18} color="#fca5a5" />
      </Pressable>

      <Pressable style={[styles.row, styles.rowLogout, { backgroundColor: activeTheme === 'dark' ? '#450a0a' : '#fff1f2', borderColor: activeTheme === 'dark' ? '#7f1d1d' : '#ffe4e6' }]} onPress={onLogout}>
        <View style={[styles.rowIcon, { backgroundColor: colors.card }]}>
          <LogOut size={18} color="#e11d48" />
        </View>
        <Text style={[styles.rowLabel, styles.rowLabelLogout]}>{t('logout')}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  row: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontWeight: '700',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowSubLabel: {
    fontSize: 12,
  },
  rowStatus: {
    fontWeight: '700',
  },
  rowStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f8fafc',
  },
  rowStatusPillActive: {
    borderColor: '#99f6e4',
    backgroundColor: '#ccfbf1',
  },
  rowStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  rowStatusPillTextActive: {
    color: '#0f766e',
  },
  rowInvisible: {
    backgroundColor: '#f0fdfa',
    borderColor: '#ccfbf1',
  },
  rowVerify: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  rowLabelVerify: {
    color: '#1d4ed8',
  },
  rowPremium: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  rowLikes: {
    backgroundColor: '#fff1f2',
    borderColor: '#ffe4e6',
  },
  rowBoost: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ede9fe',
  },
  rowPrivacy: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  rowPrivacyDelete: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  rowLogout: {
    backgroundColor: '#fff1f2',
    borderColor: '#ffe4e6',
  },
  rowLabelLogout: {
    color: '#be123c',
    fontWeight: '800',
  },
  rowInvite: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
});

export default ProfileMenu;
