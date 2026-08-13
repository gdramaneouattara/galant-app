import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  Music,
  Search,
  Sparkles,
  Theater,
  Ticket,
  Utensils
} from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';

type AgendaCategory = 'ALL' | 'CONCERT' | 'FESTIVAL' | 'NIGHTLIFE' | 'CULTURE' | 'COMEDY' | 'BUSINESS' | 'FOOD';

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

const AdminAgendaSeeder: React.FC = () => {
  const [city, setCity] = useState('Abidjan');
  const [category, setCategory] = useState<AgendaCategory>('ALL');
  const [candidates, setCandidates] = useState<TikeramaCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ imported: number; skipped: number } | null>(null);

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
      showAlert('Agenda mis a jour', `${response.imported_count || 0} evenement(s) publie(s).`);
    } catch (error: any) {
      showAlert('Erreur', error.message || "Echec de l'import Agenda.");
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h2 className="text-3xl font-serif italic tracking-tighter text-slate-900 dark:text-white sm:text-4xl">
          Agenda Tikerama
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 sm:text-lg">
          Recherchez les evenements ivoiriens, selectionnez les meilleurs, puis publiez-les dans Agenda.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
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
