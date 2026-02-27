import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable, TextInput, Alert } from 'react-native';
import { COLORS } from '../../data/mock';
import { apiRequest } from '../../lib/api';

type SegmentOption = {
  value: string;
  label: string;
};

type TemplateOption = {
  id: string;
  label: string;
  segment: string;
  title: string;
  message: string;
};

type BroadcastResponse = {
  recipientCount: number;
  segment: string;
  sentAt: string;
  broadcastId: string;
};

type AudienceResponse = {
  segment: string;
  recipientCount: number;
};

type CampaignHistoryItem = {
  campaignId: string;
  title: string;
  message: string;
  segment: string;
  sentAt: string;
  recipientCount: number;
  readCount: number;
};

const SEGMENTS: SegmentOption[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'ACTIVE', label: 'Actifs' },
  { value: 'UNVERIFIED', label: 'Non vérifiés' },
  { value: 'VERIFIED', label: 'Vérifiés' },
  { value: 'FREE', label: 'Gratuits' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'INVISIBLE_PREMIUM', label: 'Premium invisibles' },
  { value: 'SUSPENDED', label: 'Suspendus' },
];

const TEMPLATES: TemplateOption[] = [
  {
    id: 'verify_reminder',
    label: 'Rappel vérification',
    segment: 'UNVERIFIED',
    title: 'Vérification du compte requise',
    message: "Votre compte n'est pas encore vérifié. Merci de compléter votre vérification pour accéder à toutes les fonctionnalités.",
  },
  {
    id: 'suspension_notice',
    label: 'Notification suspension',
    segment: 'SUSPENDED',
    title: 'Compte suspendu',
    message: "Votre compte a été temporairement suspendu suite à une vérification de sécurité. Contactez le support pour plus d'informations.",
  },
  {
    id: 'premium_upgrade',
    label: 'Offre Premium',
    segment: 'FREE',
    title: 'Passez Premium',
    message: 'Profitez du mode invisible, des messages illimités et des boosts avancés avec Premium.',
  },
  {
    id: 'security_notice',
    label: 'Rappel sécurité',
    segment: 'ACTIVE',
    title: 'Rappel des règles de la communauté',
    message: 'Merci de respecter la charte Yamo. Les comportements non conformes peuvent entraîner une suspension.',
  },
];

const AdminMessagingScreen: React.FC = () => {
  const [segment, setSegment] = useState<string>('UNVERIFIED');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<BroadcastResponse | null>(null);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [history, setHistory] = useState<CampaignHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchAudience = useCallback(async (segmentValue: string) => {
    try {
      setLoadingAudience(true);
      const response = await apiRequest<AudienceResponse>(
        `/api/admin/messages/audience?segment=${encodeURIComponent(segmentValue)}`,
        { requireAuth: true }
      );
      setAudienceCount(response.recipientCount);
    } catch (_error) {
      setAudienceCount(null);
    } finally {
      setLoadingAudience(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const response = await apiRequest<{ campaigns: CampaignHistoryItem[] }>(
        '/api/admin/messages/history?limit=20',
        { requireAuth: true }
      );
      setHistory(response.campaigns || []);
    } catch (_error) {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void fetchAudience(segment);
  }, [segment, fetchAudience]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const applyTemplate = (template: TemplateOption) => {
    setSegment(template.segment);
    setTitle(template.title);
    setMessage(template.message);
  };

  const handleSend = async () => {
    const cleanMessage = message.trim();
    const cleanTitle = title.trim();

    if (!cleanMessage) {
      Alert.alert('Erreur', 'Le message est obligatoire.');
      return;
    }

    try {
      setSending(true);
      const response = await apiRequest<BroadcastResponse>('/api/admin/messages/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          segment,
          title: cleanTitle,
          message: cleanMessage,
        }),
        requireAuth: true,
      });

      setLastResult(response);
      setMessage('');
      await Promise.all([fetchAudience(segment), fetchHistory()]);
      Alert.alert('Envoyé', `Message envoyé à ${response.recipientCount} utilisateur(s).`);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || "Impossible d'envoyer le message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Messages administrateur</Text>
        <Text style={styles.subtitle}>Campagnes ciblées par catégorie d'utilisateurs.</Text>

        <Text style={styles.sectionTitle}>Templates</Text>
        <View style={styles.templateWrap}>
          {TEMPLATES.map((template) => (
            <Pressable key={template.id} style={styles.templateChip} onPress={() => applyTemplate(template)}>
              <Text style={styles.templateChipText}>{template.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Catégorie ciblée</Text>
        <View style={styles.segmentWrap}>
          {SEGMENTS.map((option) => {
            const selected = segment === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setSegment(option.value)}
                style={[styles.segmentChip, selected && styles.segmentChipActive]}
              >
                <Text style={[styles.segmentChipText, selected && styles.segmentChipTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.audienceCard}>
          <Text style={styles.audienceTitle}>Audience estimée</Text>
          <Text style={styles.audienceValue}>
            {loadingAudience ? 'Calcul...' : audienceCount === null ? 'Non disponible' : `${audienceCount} destinataire(s)`}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Titre (optionnel)</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ex: Information importante"
          style={styles.input}
          maxLength={120}
        />

        <Text style={styles.sectionTitle}>Message</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Écrivez le message à envoyer"
          style={[styles.input, styles.textArea]}
          multiline
          textAlignVertical="top"
          maxLength={2000}
        />
        <Text style={styles.counter}>{message.length}/2000</Text>

        <Pressable
          onPress={handleSend}
          disabled={sending}
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
        >
          <Text style={styles.sendButtonText}>{sending ? 'Envoi...' : 'Envoyer le message'}</Text>
        </Pressable>

        {lastResult ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Dernier envoi</Text>
            <Text style={styles.resultText}>Segment: {lastResult.segment}</Text>
            <Text style={styles.resultText}>Destinataires: {lastResult.recipientCount}</Text>
            <Text style={styles.resultText}>Date: {new Date(lastResult.sentAt).toLocaleString('fr-FR')}</Text>
          </View>
        ) : null}

        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Historique des campagnes</Text>
          <Pressable onPress={() => void fetchHistory()} style={styles.refreshHistoryButton}>
            <Text style={styles.refreshHistoryButtonText}>Actualiser</Text>
          </Pressable>
        </View>
        {loadingHistory ? <Text style={styles.historyEmpty}>Chargement...</Text> : null}
        {!loadingHistory && history.length === 0 ? <Text style={styles.historyEmpty}>Aucune campagne envoyée.</Text> : null}
        <View style={styles.historyList}>
          {history.map((campaign) => (
            <View key={campaign.campaignId} style={styles.historyItem}>
              <Text style={styles.historyTitle}>{campaign.title}</Text>
              <Text style={styles.historyMeta}>
                {campaign.segment} • {campaign.recipientCount} destinataires • {campaign.readCount} lus
              </Text>
              <Text style={styles.historyMessage} numberOfLines={2}>
                {campaign.message || 'Sans contenu'}
              </Text>
              <Text style={styles.historyDate}>{new Date(campaign.sentAt).toLocaleString('fr-FR')}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.ink,
  },
  subtitle: {
    color: COLORS.muted,
    marginTop: 6,
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.ink,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 6,
  },
  templateWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  templateChip: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#eff6ff',
  },
  templateChipText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
  segmentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  segmentChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  segmentChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#e0f2fe',
  },
  segmentChipText: {
    color: COLORS.ink,
    fontWeight: '600',
    fontSize: 12,
  },
  segmentChipTextActive: {
    color: '#075985',
  },
  audienceCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  audienceTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  audienceValue: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.ink,
  },
  textArea: {
    minHeight: 120,
  },
  counter: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 10,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  resultCard: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
  },
  resultTitle: {
    color: COLORS.ink,
    fontWeight: '800',
    marginBottom: 6,
  },
  resultText: {
    color: COLORS.ink,
    marginBottom: 4,
  },
  historyHeader: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshHistoryButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  refreshHistoryButtonText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  historyEmpty: {
    color: COLORS.muted,
    marginTop: 4,
  },
  historyList: {
    marginTop: 8,
    gap: 8,
  },
  historyItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    gap: 3,
  },
  historyTitle: {
    color: COLORS.ink,
    fontWeight: '800',
    fontSize: 13,
  },
  historyMeta: {
    color: COLORS.muted,
    fontSize: 12,
  },
  historyMessage: {
    color: COLORS.ink,
    fontSize: 12,
  },
  historyDate: {
    color: COLORS.muted,
    fontSize: 11,
  },
});

export default AdminMessagingScreen;
