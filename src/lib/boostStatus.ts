export type BoostStatus = {
  active: boolean;
  endsAt: Date | null;
  remainingLabel: string | null;
};

const formatBoostRemaining = (remainingMs: number): string => {
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} jour${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} h`);
  if (days === 0 && minutes > 0) parts.push(`${minutes} min`);

  return parts.join(' et ');
};

export const getBoostStatus = (boostedUntil?: string | null): BoostStatus => {
  if (!boostedUntil) {
    return { active: false, endsAt: null, remainingLabel: null };
  }

  const endsAt = new Date(boostedUntil);
  const remainingMs = endsAt.getTime() - Date.now();
  if (!Number.isFinite(endsAt.getTime()) || remainingMs <= 0) {
    return { active: false, endsAt: null, remainingLabel: null };
  }

  return {
    active: true,
    endsAt,
    remainingLabel: formatBoostRemaining(remainingMs),
  };
};

export const getBoostActiveMessage = (boostedUntil?: string | null): string => {
  const status = getBoostStatus(boostedUntil);
  if (!status.active) {
    return '';
  }

  const endsAtText = status.endsAt
    ? ` Il se termine le ${status.endsAt.toLocaleDateString('fr-FR')} à ${status.endsAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`
    : '';

  return `Votre profil est déjà boosté. Il reste environ ${status.remainingLabel}.${endsAtText}`;
};
