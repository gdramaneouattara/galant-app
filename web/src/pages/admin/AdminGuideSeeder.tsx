import React, { useState } from 'react';
import {
  Database,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
  Loader2
} from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';

type SeedResult = {
  candidates: number;
  created: number;
  skipped: number;
  editorial: number;
};

const AdminGuideSeeder: React.FC = () => {
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SeedResult | null>(null);

  const handleSeed = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanCity = city.trim();
    if (!cleanCity) return;

    if (!window.confirm(`Peupler le Guide avec les 20 meilleurs lieux a ${cleanCity} via Google Maps ?`)) return;

    setLoading(true);
    setProgress(12);
    setResult(null);
    let timer: number | undefined;

    try {
      timer = window.setInterval(() => {
        setProgress((current) => Math.min(current + 8, 88));
      }, 700);

      const response = await apiRequest<{
        candidateCount: number;
        createdCount: number;
        skippedCount: number;
        editorialCount: number;
      }>('/api/admin/venues/seed', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ city: cleanCity })
      });

      setProgress(100);
      setResult({
        candidates: response.candidateCount || 0,
        created: response.createdCount || 0,
        skipped: response.skippedCount || 0,
        editorial: response.editorialCount || 0
      });
      showAlert('Succes', `Processus termine : ${response.createdCount || 0} lieux ajoutes.`);
    } catch (error: any) {
      setProgress(0);
      showAlert('Erreur', error.message || 'Echec de la recuperation des adresses.');
    } finally {
      if (timer) window.clearInterval(timer);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h2 className="text-3xl font-serif italic tracking-tighter text-slate-900 dark:text-white sm:text-4xl">
          Generateur de Guide
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 sm:text-lg">
          Peuplez instantanement le guide Galant via Google Places.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-8 rounded-[3rem] border border-slate-100 bg-white p-10 shadow-xl dark:border-white/5 dark:bg-slate-900">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                <Database size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-serif italic tracking-tighter text-slate-900 dark:text-white leading-none">
                  Extraction Google Maps
                </h3>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Donnees en temps reel
                </p>
              </div>
            </div>

            <form onSubmit={handleSeed} className="space-y-6">
              <div className="space-y-2">
                <label className="ml-2 text-xs font-black uppercase tracking-prestige text-slate-400">
                  Ville cible
                </label>
                <div className="group relative">
                  <MapPin size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Ex: Douala, Abidjan, Yaounde..."
                    className="w-full rounded-2xl border-none bg-slate-50 py-5 pl-16 pr-6 font-bold text-slate-900 outline-none transition-all focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !city.trim()}
                className="flex w-full items-center justify-center gap-3 rounded-3xl bg-primary py-6 text-xs font-black uppercase tracking-prestige text-white shadow-xl shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:scale-100 disabled:opacity-30"
              >
                {loading ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />}
                Peupler le Guide
              </button>
            </form>

            {(loading || progress > 0) && (
              <div className="space-y-3">
                <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>{loading ? 'Recherche Google Places' : 'Import termine'}</span>
                  <span>{progress}%</span>
                </div>
              </div>
            )}
          </div>

          {result && (
            <div className="flex items-center justify-between rounded-[2.5rem] border border-emerald-100 bg-emerald-50 p-8 animate-in zoom-in duration-300 dark:border-emerald-500/20 dark:bg-emerald-950/20">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm dark:bg-emerald-500/20">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-lg font-black leading-none text-emerald-900 dark:text-emerald-400">
                    Importation reussie
                  </p>
                  <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-500/60">
                    {result.candidates} lieux qualifies, {result.editorial} recommandations editoriales.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-right">
                <div>
                  <span className="block text-2xl font-black text-emerald-900 dark:text-white">{result.created}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Nouveaux</span>
                </div>
                <div>
                  <span className="block text-2xl font-black text-emerald-900 dark:text-white">{result.skipped}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Doublons</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="relative space-y-6 overflow-hidden rounded-[3rem] bg-slate-900 p-8 text-white shadow-2xl">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            <div className="flex items-center gap-3">
              <Info className="text-primary" size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest text-primary">Comment ca marche ?</h3>
            </div>
            <ul className="space-y-4 text-xs font-medium leading-relaxed text-slate-400">
              <li>Restaurants, night clubs, bars et hotels sont cherches separement.</li>
              <li>Seuls les lieux avec une note strictement superieure a 4.0 sont importes.</li>
              <li>Les doublons Google Places sont automatiquement ignores.</li>
              <li>Les lieux sont marques Conseil Galant avec le flag editorial.</li>
            </ul>
          </div>

          <div className="flex items-center gap-4 rounded-[2.5rem] border border-slate-100 bg-white p-6 dark:border-white/5 dark:bg-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-500/10">
              <AlertCircle size={18} />
            </div>
            <p className="text-[10px] font-bold uppercase leading-relaxed tracking-wider text-slate-400 dark:text-slate-500">
              Une cle Google Maps valide avec Places API activee est requise cote backend.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminGuideSeeder;
