import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, XCircle, Clock } from 'lucide-react-native';

interface VenueStatusCardProps {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  colors: any;
}

const VenueStatusCard: React.FC<VenueStatusCardProps> = ({ status, colors }) => {
  const getStatusInfo = (s: string) => {
    switch (s) {
      case 'APPROVED':
        return {
          label: 'Actif',
          color: '#16a34a',
          icon: CheckCircle2,
          description: 'Félicitations ! Votre établissement est visible par toute la communauté.'
        };
      case 'REJECTED':
        return {
          label: 'Refusé',
          color: '#dc2626',
          icon: XCircle,
          description: 'Votre demande n\'a pas pu être acceptée. Contactez le support pour plus d\'infos.'
        };
      default:
        return {
          label: 'En attente de validation',
          color: '#b45309',
          icon: Clock,
          description: 'Votre établissement sera visible dans le Guide Galant dès validation par nos modérateurs.'
        };
    }
  };

  const info = getStatusInfo(status);
  const Icon = info.icon;

  return (
    <View style={[styles.statusCard, { borderColor: info.color + '40', backgroundColor: info.color + '10' }]}>
      <Icon size={24} color={info.color} />
      <View style={styles.statusTextWrap}>
        <Text style={[styles.statusLabel, { color: info.color }]}>{info.label}</Text>
        <Text style={[styles.statusSub, { color: colors.textMuted }]}>
          {info.description}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statusCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    alignItems: 'center',
  },
  statusTextWrap: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  statusSub: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
});

export default VenueStatusCard;
