type MediaVariant = {
  thumb?: string | null;
  medium?: string | null;
  full?: string | null;
};

type MediaVariantsMap = Record<string, MediaVariant> | null | undefined;

export const optimizedPhotoUrl = (
  photoUrl: string | null | undefined,
  variants: MediaVariantsMap,
  preferred: 'thumb' | 'medium' | 'full' = 'medium'
) => {
  if (!photoUrl) return photoUrl || '';
  const item = variants?.[photoUrl];
  if (!item) return photoUrl;
  if (preferred === 'thumb') return item.thumb || item.medium || item.full || photoUrl;
  if (preferred === 'medium') return item.medium || item.thumb || item.full || photoUrl;
  return item.full || item.medium || item.thumb || photoUrl;
};
