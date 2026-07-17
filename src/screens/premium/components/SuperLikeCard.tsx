import React from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Heart, Lock } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

type SuperLikeStatus = 'PENDING' | 'ACCEPTED' | 'IGNORED';

interface SuperLikeRow {
  id: string;
  sender_id: string;
  status: SuperLikeStatus;
  created_at: string;
  is_locked?: boolean;
  note?: string | null;
  user: {
    id: string;
    name: string;
    age: number;
    photos: string[];
    city: string | null;
  };
  price_amount?: number;
  currency?: string;
}

interface SuperLikeCardProps {
  row: SuperLikeRow;
  onRespond: (row: any, action: 'ACCEPT' | 'IGNORE') => void;
  onLike: (row: any) => void;
  onUnlock: (row: any) => void;
  onOpenProfile: (row: any) => void;
  isLiked: boolean;
  isResponding: boolean;
  isLiking: boolean;
  isUnlocking: boolean;
}

const SuperLikeCard: React.FC<SuperLikeCardProps> = ({
  row,
  onRespond,
  onLike,
  onUnlock,
  onOpenProfile,
  isLiked,
  isResponding,
  isLiking,
  isUnlocking,
}) => {
  const renderStatusPill = (status: SuperLikeStatus) => {
    if (status === 'ACCEPTED') {
      return (
        <View style={[styles.statusPill, styles.statusPillAccepted]}>
          <Text style={[styles.statusPillText, styles.statusPillTextAccepted]}>Accepté</Text>
        </View>
      );
    }
    if (status === 'IGNORED') {
      return (
        <View style={[styles.statusPill, { backgroundColor: '#f1f5f9' }]}>
          <Text style={[styles.statusPillText, { color: '#64748b' }]}>Ignoré</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusPill, styles.statusPillPending]}>
        <Text style={[styles.statusPillText, styles.statusPillTextPending]}>En attente</Text>
      </View>
    );
  };

  return (
    <View style={[styles.card, row.is_locked && styles.lockedCard]}>
      <View style={styles.photoContainer}>
        <Image
          source={{
            uri: row.user.photos?.[0] || 'https://placehold.co/400x600',
          }}
          style={styles.photo}
          blurRadius={row.is_locked ? 15 : 0}
        />
        {row.is_locked && (
          <View style={styles.lockOverlay}>
            <Lock size={20} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{row.user.name}{!row.is_locked && `, ${row.user.age}`}</Text>
          <Text style={{ fontSize: 16 }}>🌹</Text>
          {renderStatusPill(row.status)}
        </View>

        {row.is_locked ? (
          <View style={styles.lockedNoteBox}>
            <Text style={styles.lockedNoteText}>Une note parfumée vous attend...</Text>
            <Pressable
              style={styles.unlockSmallBtn}
              onPress={() => onUnlock(row)}
              disabled={isUnlocking}
            >
              {isUnlocking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.unlockSmallBtnText}>Débloquer (500 F)</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <>
            {row.note && (
              <View style={styles.noteBubble}>
                <Text style={styles.noteText}>"{row.note}"</Text>
              </View>
            )}
            <Text style={styles.meta}>{row.user.city || 'Ville non renseignée'}</Text>
            <Text style={styles.meta}>Reçu le {new Date(row.created_at).toLocaleString('fr-FR')}</Text>
          </>
        )}

        <View style={styles.actionsRow}>
          {!row.is_locked && (
            <Pressable style={styles.secondaryButton} onPress={() => onOpenProfile(row)}>
              <Text style={styles.secondaryButtonText}>Fiche</Text>
            </Pressable>
          )}
          <Pressable
            style={[
              styles.likeButton,
              isLiked && styles.likeButtonDone,
              isLiking && styles.buttonDisabled,
              row.is_locked && { opacity: 0.5 }
            ]}
            onPress={() => onLike(row)}
            disabled={isLiked || isLiking || row.is_locked}
          >
            <Heart size={16} color="#fff" fill="#fff" />
          </Pressable>
          {row.status === 'PENDING' && !row.is_locked && (
            <>
              <Pressable
                style={[styles.primaryButton, isResponding && styles.buttonDisabled]}
                onPress={() => onRespond(row, 'ACCEPT')}
                disabled={isResponding}
              >
                <Text style={styles.primaryButtonText}>{isResponding ? '...' : 'Accepter'}</Text>
              </Pressable>
              <Pressable
                style={[styles.ghostDangerButton, isResponding && styles.buttonDisabled]}
                onPress={() => onRespond(row, 'IGNORE')}
                disabled={isResponding}
              >
                <Text style={styles.ghostDangerButtonText}>Ignorer</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    flexDirection: 'row',
    gap: 10,
  },
  lockedCard: {
    borderColor: '#fecdd3',
    backgroundColor: '#fff1f2',
  },
  photoContainer: {
    width: 78,
    height: 110,
    borderRadius: 10,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(225, 29, 72, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontWeight: '800',
    color: COLORS.ink,
    fontSize: 15,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillPending: {
    backgroundColor: '#fef3c7',
  },
  statusPillAccepted: {
    backgroundColor: '#dcfce7',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillTextPending: {
    color: '#b45309',
  },
  statusPillTextAccepted: {
    color: '#15803d',
  },
  lockedNoteBox: {
    gap: 6,
    marginVertical: 4,
  },
  lockedNoteText: {
    fontSize: 12,
    color: '#be123c',
    fontWeight: '700',
    fontStyle: 'italic',
  },
  unlockSmallBtn: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  unlockSmallBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  noteBubble: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#e11d48',
    marginVertical: 4,
  },
  noteText: {
    fontSize: 13,
    color: COLORS.ink,
    fontStyle: 'italic',
  },
  meta: {
    color: COLORS.muted,
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 12,
  },
  likeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeButtonDone: {
    backgroundColor: '#16a34a',
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  ghostDangerButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  ghostDangerButtonText: {
    color: '#b91c1c',
    fontWeight: '800',
    fontSize: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default SuperLikeCard;
