import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Music,
  RefreshCw,
  Search,
  Sparkles,
  Theater,
  Ticket,
  Trash2,
  Utensils
} from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';
import { uploadImageVariantsWeb } from '../../lib/imageUploadVariants';
import OptimizedImage from '../../components/OptimizedImage';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';
import { useAuth } from '../../context/AuthContext';

type AgendaCategory = 'ALL' | 'CONCERT' | 'FESTIVAL' | 'NIGHTLIFE' | 'CULTURE' | 'COMEDY' | 'BUSINESS' | 'FOOD';
type AdminAgendaEventType = 'EVENT' | 'PARTY' | 'FLASH_OFFER' | 'NETWORKING' | 'LIVE_MUSIC';

type TikeramaCandidate = {
  external_id: string;
  source: 'TIKERAMA';
  title: string;
  description?: string;
  photo_url?: string;
  image?: string;
  start_date: string;
  end_date: string;
  venue_name: string;
  address?: string;
  city: string;
  country: string;
  price_label?: string | null;
  source_url: string;
  external_ticket_url?: string;
  event_type: 'EVENT' | 'PARTY' | 'FLASH_OFFER' | 'NETWORKING' | 'LIVE_MUSIC';
};

type PublishedAgendaEvent = {
  id: string;
  title: string;
  starts_at: string;
  expires_at: string;
  event_type?: string;
  source?: string;
  status_label: 'UPCOMING' | 'EXPIRED';
  venues?: {
    name?: string | null;
    city?: string | null;
  } | null;
};

type PublishedStatus = 'UPCOMING' | 'EXPIRED' | 'ALL';

type ImageVariantMap = Record<string, { full: string; medium: string; thumb: string }>;

const AGENDA_CATEGORIES: Array<{
  id: AgendaCategory;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: 'ALL', label: 'Tout', icon: Sparkles },
  { id: 'CONCERT', label: 'Concerts', icon: Music },
  { id: 'FESTIVAL', label: 'Festivals', icon: Ticket },
  { id: 'NIGHTLIFE', label: 'Soirees', icon: CalendarPlus },
  { id: 'CULTURE', label: 'Culture', icon: Theater },
  { id: 'COMEDY', label: 'Humour', icon: Theater },
  { id: 'BUSINESS', label: 'Business', icon: Sparkles },
  { id: 'FOOD', label: 'Gastronomie', icon: Utensils }
];

const ADMIN_EVENT_TYPES: Array<{ id: AdminAgendaEventType; label: string }> = [
  { id: 'EVENT', label: 'Evenement' },
  { id: 'PARTY', label: 'Soiree' },
  { id: 'LIVE_MUSIC', label: 'Concert / Live' },
  { id: 'NETWORKING', label: 'Networking' },
  { id: 'FLASH_OFFER', label: 'Offre Flash' }
];

const getImageRatio = (file: File) => new Promise<number>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image.width / image.height);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('invalid_image'));
  };
  image.src = url;
});

const AdminAgendaSeeder: React.FC = () => {
  const { user } = useAuth();
  const [city, setCity] = useState('Abidjan');
  const [category, setCategory] = useState<AgendaCategory>('ALL');
  const [candidates, setCandidates] = useState<TikeramaCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [publishedStatus, setPublishedStatus] = useState<PublishedStatus>('UPCOMING');
  const [publishedEvents, setPublishedEvents] = useState<PublishedAgendaEvent[]>([]);
  const [publishedLoading, setPublishedLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [posterUploading, setPosterUploading] = useState(false);
  const [manualPublishing, setManualPublishing] = useState(false);
  const [manualForm, setManualForm] = useState({
    title: '',
    description: '',
    venueName: 'Agenda Galant',
    city: 'Abidjan',
    address: '',
    eventType: 'EVENT' as AdminAgendaEventType,
    startsAt: '',
    expiresAt: '',
    priceLabel: '',
    photoUrl: '',
    photoVariants: {} as ImageVariantMap
  });

  const selectedCandidates = useMemo(
    () => candidates.filter((candidate) => selectedIds.includes(candidate.external_id)),
    [candidates, selectedIds]
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const toggleAll = () => {
    setSelectedIds((current) => (
      current.length === candidates.length ? [] : candidates.map((candidate) => candidate.external_id)
    ));
  };

  const fetchPublishedEvents = useCallback(async () => {
    setPublishedLoading(true);
    try {
      const response = await apiRequest<{ events: PublishedAgendaEvent[] }>(
        `/api/admin/agenda/events?status=${publishedStatus}`,
        { requireAuth: true }
      );
      setPublishedEvents(response.events || []);
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Impossible de charger les evenements publies.');
    } finally {
      setPublishedLoading(false);
    }
  }, [publishedStatus]);

  useEffect(() => {
    void fetchPublishedEvents();
  }, [fetchPublishedEvents]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanCity = city.trim();
    if (!cleanCity) return;

    setSearchLoading(true);
    setLastResult(null);
    setCandidates([]);
    setSelectedIds([]);

    try {
      const response = await apiRequest<{
        candidates: TikeramaCandidate[];
        candidateCount: number;
        scannedCount: number;
      }>('/api/admin/agenda/tikerama/search', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ city: cleanCity, category })
      });

      setCandidates(response.candidates || []);
      setSelectedIds((response.candidates || []).map((candidate) => candidate.external_id));
      showAlert('Recherche terminee', `${response.candidateCount || 0} evenement(s) trouve(s) sur Tikerama.`);
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Impossible de consulter Tikerama.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedCandidates.length) return;
    if (!window.confirm(`Publier ${selectedCandidates.length} evenement(s) selectionne(s) dans Agenda ?`)) return;

    setImportLoading(true);
    try {
      const response = await apiRequest<{
        imported_count: number;
        skipped_count: number;
      }>('/api/admin/agenda/tikerama/import', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ candidates: selectedCandidates })
      });

      setLastResult({
        imported: response.imported_count || 0,
        skipped: response.skipped_count || 0
      });
      void fetchPublishedEvents();
      showAlert('Agenda mis a jour', `${response.imported_count || 0} evenement(s) publie(s).`);
    } catch (error: any) {
      showAlert('Erreur', error.message || "Echec de l'import Agenda.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleDeletePublishedEvent = async (eventId: string) => {
    if (!window.confirm('Supprimer cet evenement de Firestore ?')) return;

    try {
      await apiRequest(`/api/admin/agenda/events/${eventId}`, {
        method: 'DELETE',
        requireAuth: true
      });
      setPublishedEvents((current) => current.filter((event) => event.id !== eventId));
      showAlert('Evenement supprime', "L'evenement a ete retire de Firestore.");
    } catch (error: any) {
      showAlert('Erreur', error.message || "Impossible de supprimer l'evenement.");
    }
  };

  const handleCleanupExpiredEvents = async () => {
    if (!window.confirm('Supprimer automatiquement tous les evenements expires de Firestore ?')) return;

    setCleanupLoading(true);
    try {
      const response = await apiRequest<{ deletedCount: number; attendanceDeletedCount: number }>(
        '/api/admin/agenda/events/cleanup-expired',
        { method: 'POST', requireAuth: true }
      );
      await fetchPublishedEvents();
      showAlert(
        'Purge terminee',
        `${response.deletedCount || 0} evenement(s) expire(s) et ${response.attendanceDeletedCount || 0} inscription(s) supprime(s).`
      );
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Impossible de purger les evenements expires.');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handlePosterUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      showAlert('Format invalide', 'Selectionnez une image pour publier une affiche.');
      return;
    }

    setPosterUploading(true);
    try {
      const ratio = await getImageRatio(file);
      const expectedRatio = 16 / 9;
      const tolerance = 0.08;
      if (Math.abs(ratio - expectedRatio) > tolerance) {
        showAlert('Affiche 16:9 requise', 'Utilisez une affiche horizontale au format 16:9 pour eviter les recadrages dans Agenda.');
        return;
      }

      const { fullUrl, variants } = await uploadImageVariantsWeb(
        file,
        `events/admin/${user.uid}/${Date.now()}_poster.webp`
      );
      setManualForm((current) => ({
        ...current,
        photoUrl: fullUrl,
        photoVariants: { [fullUrl]: variants }
      }));
      showAlert('Affiche chargee', "L'affiche 16:9 est prete a etre publiee.");
    } catch (error: any) {
      showAlert('Erreur', error.message || "Impossible de charger l'affiche.");
    } finally {
      setPosterUploading(false);
    }
  };

  const handlePublishManualEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (manualPublishing) return;
    if (!manualForm.title.trim() || !manualForm.startsAt || !manualForm.expiresAt || !manualForm.photoUrl) {
      showAlert('Champs requis', 'Ajoutez au minimum un titre, une affiche 16:9, une date de debut et une date de fin.');
      return;
    }

    const startsAt = new Date(manualForm.startsAt);
    const expiresAt = new Date(manualForm.expiresAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(expiresAt.getTime()) || expiresAt <= startsAt) {
      showAlert('Dates invalides', 'La date de fin doit etre posterieure a la date de debut.');
      return;
    }

    setManualPublishing(true);
    try {
      await apiRequest('/api/admin/agenda/events', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          ...manualForm,
          startsAt: startsAt.toISOString(),
          expiresAt: expiresAt.toISOString()
        })
      });
      await fetchPublishedEvents();
      setManualForm((current) => ({
        ...current,
        title: '',
        description: '',
        address: '',
        priceLabel: '',
        startsAt: '',
        expiresAt: '',
        photoUrl: '',
        photoVariants: {}
      }));
      showAlert('Agenda mis a jour', "L'affiche admin a ete publiee dans Agenda.");
    } catch (error: any) {
      showAlert('Erreur', error.message || "Impossible de publier l'affiche.");
    } finally {
      setManualPublishing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h2 className="text-3xl font-serif italic tracking-tighter text-slate-900 dark:text-white sm:text-4xl">
          Agenda Galant
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 sm:text-lg">
          Publiez vos affiches 16:9 ou selectionnez des evenements ivoiriens depuis Tikerama.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="rounded-[3rem] border border-slate-100 bg-white p-8 shadow-xl dark:border-white/5 dark:bg-slate-900">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ImageIcon size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Publier une affiche 16:9</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Publication admin directe, separee de Tikerama.
                </p>
              </div>
            </div>

            <form onSubmit={handlePublishManualEvent} className="grid gap-6 lg:grid-cols-[minmax(280px,380px)_1fr]">
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-prestige text-slate-400">
                  Affiche obligatoire
                </label>
                <div className="relative aspect-video overflow-hidden rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                  {manualForm.photoUrl ? (
                    <OptimizedImage
                      src={optimizedPhotoUrl(manualForm.photoUrl, manualForm.photoVariants, 'medium')}
                      className="h-full w-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-400">
                      <ImageIcon size={42} strokeWidth={1.2} />
                      <span className="text-center text-[10px] font-black uppercase tracking-widest">
                        Format horizontal 16:9
                      </span>
                    </div>
                  )}
                  <label className="absolute bottom-4 right-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-primary shadow-lg transition-all hover:scale-105 active:scale-95 dark:bg-slate-800">
                    {posterUploading ? <Loader2 className="animate-spin" size={14} /> : <ImageIcon size={14} />}
                    Charger
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePosterUpload}
                      disabled={posterUploading}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs font-medium leading-relaxed text-slate-400">
                  L'image est compressee en variantes full, medium et thumb avant publication.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="ml-2 text-xs font-black uppercase tracking-prestige text-slate-400">Titre</label>
                  <input
                    value={manualForm.title}
                    onChange={(event) => setManualForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Ex: Concert prestige, Brunch networking..."
                    className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="ml-2 text-xs font-black uppercase tracking-prestige text-slate-400">Ville</label>
                  <input
                    value={manualForm.city}
                    onChange={(event) => setManualForm((current) => ({ ...current, city: event.target.value }))}
                    className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="ml-2 text-xs font-black uppercase tracking-prestige text-slate-400">Lieu</label>
                  <input
                    value={manualForm.venueName}
                    onChange={(event) => setManualForm((current) => ({ ...current, venueName: event.target.value }))}
                    placeholder="Nom du lieu"
                    className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="ml-2 text-xs font-black uppercase tracking-prestige text-slate-400">Debut</label>
                  <input
                    type="datetime-local"
                    value={manualForm.startsAt}
                    onChange={(event) => setManualForm((current) => ({ ...current, startsAt: event.target.value }))}
                    className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="ml-2 text-xs font-black uppercase tracking-prestige text-slate-400">Fin</label>
                  <input
                    type="datetime-local"
                    value={manualForm.expiresAt}
                    onChange={(event) => setManualForm((current) => ({ ...current, expiresAt: event.target.value }))}
                    className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="ml-2 text-xs font-black uppercase tracking-prestige text-slate-400">Type</label>
                  <select
                    value={manualForm.eventType}
                    onChange={(event) => setManualForm((current) => ({ ...current, eventType: event.target.value as AdminAgendaEventType }))}
                    className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:text-white"
                  >
                    {ADMIN_EVENT_TYPES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="ml-2 text-xs font-black uppercase tracking-prestige text-slate-400">Prix</label>
                  <input
                    value={manualForm.priceLabel}
                    onChange={(event) => setManualForm((current) => ({ ...current, priceLabel: event.target.value }))}
                    placeholder="Ex: Gratuit, 10 000 F"
                    className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="ml-2 text-xs font-black uppercase tracking-prestige text-slate-400">Description</label>
                  <textarea
                    value={manualForm.description}
                    onChange={(event) => setManualForm((current) => ({ ...current, description: event.target.value }))}
                    rows={3}
                    placeholder="Informations utiles pour les membres..."
                    className="w-full resize-none rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={manualPublishing || posterUploading}
                  className="md:col-span-2 flex w-full items-center justify-center gap-3 rounded-3xl bg-slate-950 py-5 text-xs font-black uppercase tracking-prestige text-white shadow-xl transition-all hover:scale-[1.01] active:scale-95 disabled:scale-100 disabled:opacity-40 dark:bg-white dark:text-slate-950"
                >
                  {manualPublishing ? <Loader2 className="animate-spin" size={18} /> : <CalendarPlus size={18} />}
                  Publier dans Agenda
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-[3rem] border border-slate-100 bg-white p-8 shadow-xl dark:border-white/5 dark:bg-slate-900">
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <div className="space-y-2">
                  <label className="ml-2 text-xs font-black uppercase tracking-prestige text-slate-400">
                    Ville cible
                  </label>
                  <div className="relative">
                    <MapPin size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="Abidjan, Bouake, Yamoussoukro..."
                      className="w-full rounded-2xl border-none bg-slate-50 py-5 pl-14 pr-5 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="ml-2 text-xs font-black uppercase tracking-prestige text-slate-400">
                    Categorie
                  </label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as AgendaCategory)}
                    className="h-[60px] w-full rounded-2xl border-none bg-slate-50 px-5 text-xs font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:text-white"
                  >
                    {AGENDA_CATEGORIES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {AGENDA_CATEGORIES.map((item) => {
                  const Icon = item.icon;
                  const active = category === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                        active
                          ? 'bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900'
                          : 'border border-slate-100 bg-slate-50 text-slate-400 hover:border-primary/20 hover:text-primary dark:border-white/5 dark:bg-white/5'
                      }`}
                    >
                      <Icon size={14} />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={searchLoading || !city.trim()}
                className="flex w-full items-center justify-center gap-3 rounded-3xl bg-primary py-5 text-xs font-black uppercase tracking-prestige text-white shadow-xl shadow-red-500/20 transition-all hover:scale-[1.01] active:scale-95 disabled:scale-100 disabled:opacity-40"
              >
                {searchLoading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                Rechercher sur Tikerama
              </button>
            </form>
          </div>

          {candidates.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-100 bg-white p-5 dark:border-white/5 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {candidates.length} evenement(s) proposes
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {selectedIds.length} selectionne(s) pour publication
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-primary dark:border-white/10"
                  >
                    {selectedIds.length === candidates.length ? 'Tout retirer' : 'Tout selectionner'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleImport()}
                    disabled={importLoading || selectedCandidates.length === 0}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 transition-all disabled:opacity-40"
                  >
                    {importLoading ? <Loader2 className="animate-spin" size={14} /> : <CalendarPlus size={14} />}
                    Publier
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {candidates.map((candidate) => {
                  const selected = selectedIds.includes(candidate.external_id);
                  return (
                    <article
                      key={candidate.external_id}
                      className={`grid gap-4 rounded-[2.5rem] border p-4 transition-all md:grid-cols-[132px_1fr] ${
                        selected
                          ? 'border-primary/40 bg-primary/5 dark:bg-primary/10'
                          : 'border-slate-100 bg-white dark:border-white/5 dark:bg-slate-900'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSelected(candidate.external_id)}
                        className="relative aspect-video overflow-hidden rounded-[2rem] bg-slate-100 md:aspect-square dark:bg-slate-800"
                      >
                        {candidate.photo_url ? (
                          <img src={candidate.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <Ticket size={28} />
                          </div>
                        )}
                        <span className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                          selected ? 'border-primary bg-primary text-white' : 'border-white bg-black/40 text-white'
                        }`}>
                          {selected && <CheckCircle2 size={18} />}
                        </span>
                      </button>

                      <div className="min-w-0 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                              {candidate.city} - {new Date(candidate.start_date).toLocaleDateString('fr-FR')}
                            </p>
                            <h3 className="mt-1 text-xl font-black leading-tight text-slate-900 dark:text-white">
                              {candidate.title}
                            </h3>
                            <p className="mt-1 truncate text-xs font-bold text-slate-400">
                              {candidate.venue_name} {candidate.price_label ? `- ${candidate.price_label}` : ''}
                            </p>
                          </div>
                          <a
                            href={candidate.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition-colors hover:text-primary dark:bg-white/5"
                          >
                            <ExternalLink size={18} />
                          </a>
                        </div>
                        <p className="line-clamp-2 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                          {candidate.description || 'Evenement reference depuis Tikerama.'}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-4 rounded-[3rem] border border-slate-100 bg-white p-6 shadow-xl dark:border-white/5 dark:bg-slate-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Evenements publies</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Les evenements expires disparaissent de l'Agenda et sont purges automatiquement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCleanupExpiredEvents()}
                disabled={cleanupLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-primary transition-all disabled:opacity-40 dark:border-red-500/20 dark:bg-red-500/10"
              >
                {cleanupLoading ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                Purger les expires
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'UPCOMING', label: 'A venir' },
                { id: 'EXPIRED', label: 'Expires' },
                { id: 'ALL', label: 'Tous' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPublishedStatus(item.id as PublishedStatus)}
                  className={`rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                    publishedStatus === item.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-50 text-slate-400 hover:text-primary dark:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void fetchPublishedEvents()}
                disabled={publishedLoading}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-primary disabled:opacity-40 dark:border-white/10"
              >
                <RefreshCw size={14} className={publishedLoading ? 'animate-spin' : ''} />
                Actualiser
              </button>
            </div>

            <div className="space-y-3">
              {publishedLoading ? (
                <div className="flex justify-center py-10 text-slate-400">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              ) : publishedEvents.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/10">
                  Aucun evenement dans ce filtre.
                </div>
              ) : (
                publishedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col gap-3 rounded-[2rem] border border-slate-100 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest ${
                          event.status_label === 'EXPIRED'
                            ? 'bg-red-100 text-primary dark:bg-red-500/10'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                        }`}>
                          {event.status_label === 'EXPIRED' ? 'Expire' : 'A venir'}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {event.event_type || 'EVENT'} {event.source ? `- ${event.source}` : ''}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-sm font-black text-slate-900 dark:text-white">{event.title}</p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {event.venues?.name || 'Lieu non renseigne'} - {event.venues?.city || 'Ville non renseignee'} - {new Date(event.starts_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeletePublishedEvent(event.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-primary shadow-sm transition-all hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[3rem] bg-slate-950 p-8 text-white shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <AlertCircle className="text-primary" size={20} />
              <p className="text-xs font-black uppercase tracking-widest text-primary">Mode editorial</p>
            </div>
            <div className="space-y-4 text-sm font-medium leading-relaxed text-slate-400">
              <p>Tikerama ne publie rien automatiquement dans Galant.</p>
              <p>L'admin controle la ville, la categorie, puis choisit les evenements qui meritent d'apparaitre dans Agenda.</p>
              <p>Les partenaires gardent leur propre publication d'evenements depuis leur espace dedie.</p>
            </div>
          </div>

          {lastResult && (
            <div className="rounded-[2.5rem] border border-emerald-100 bg-emerald-50 p-6 dark:border-emerald-500/20 dark:bg-emerald-950/20">
              <p className="text-lg font-black text-emerald-900 dark:text-emerald-300">Publication terminee</p>
              <p className="mt-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                {lastResult.imported} publie(s), {lastResult.skipped} ignore(s).
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default AdminAgendaSeeder;
