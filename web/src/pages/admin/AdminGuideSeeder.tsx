import React, { useState } from 'react';
import {
  Database,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
  Loader2
} from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';

const AdminGuideSeeder: React.FC = () => {
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  const handleSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;

    if (!window.confirm(`Voulez-vous peupler le guide avec les 20 meilleurs lieux à ${city} via Google Maps ?`)) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await apiRequest<{ createdCount: number; skippedCount: number }>('/api/admin/venues/seed', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ city: city.trim() })
      });
      setResult({ created: res.createdCount, skipped: res.skippedCount });
      showAlert('Succès', `Processus terminé : ${res.createdCount} lieux ajoutés.`);
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Échec de la récupération des adresses.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h2 className="text-3xl font-serif italic tracking-tighter text-slate-900 dark:text-white sm:text-4xl">Générateur de Guide</h2>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 sm:text-lg">Peuplez instantanément le guide Galant via Google Places.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Form */}
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-xl border border-slate-100 dark:border-white/5 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600">
                <Database size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-serif italic tracking-tighter text-slate-900 dark:text-white leading-none">Extraction Google Maps</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Données en temps réel</p>
              </div>
            </div>

            <form onSubmit={handleSeed} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-prestige ml-2">Ville cible</label>
                <div className="relative group">
                  <MapPin size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Douala, Abidjan, Yaoundé..."
                    className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl py-5 pl-16 pr-6 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !city.trim()}
                className="w-full bg-primary text-white py-6 rounded-3xl font-black text-xs uppercase tracking-prestige flex items-center justify-center gap-3 shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
              >
                {loading ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />}
                Lancer l'importation de prestige
              </button>
            </form>
          </div>

          {/* Results Summary */}
          {result && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-500/20 p-8 rounded-[2.5rem] flex items-center justify-between animate-in zoom-in duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-emerald-900 dark:text-emerald-400 font-black text-lg leading-none">Importation réussie</p>
                  <p className="text-emerald-600 dark:text-emerald-500/60 text-xs font-medium mt-1">Les lieux ont été ajoutés au statut 'APPROUVÉ'.</p>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-2xl font-black text-emerald-900 dark:text-white">{result.created}</span>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Nouveaux lieux</span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl"></div>
            <div className="flex items-center gap-3">
              <Info className="text-primary" size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest text-primary">Comment ça marche ?</h3>
            </div>
            <ul className="space-y-4 text-xs font-medium text-slate-400 leading-relaxed">
              <li>• L'outil cherche les meilleurs **restaurants**, **lounges** et **hôtels** via Google.</li>
              <li>• Seuls les lieux avec une note &gt; 4.0 sont importés.</li>
              <li>• Les doublons (même Google ID) sont automatiquement filtrés.</li>
              <li>• Les photos sont récupérées en haute définition.</li>
            </ul>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
               <AlertCircle size={18} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-relaxed">
              Chaque importation coûte quelques centimes sur votre quota Google Maps Cloud.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminGuideSeeder;
