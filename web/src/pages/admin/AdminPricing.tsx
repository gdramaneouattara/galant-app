import React, { useEffect, useState } from 'react';
import { apiRequest } from '@shared/lib/api';
import { Save, RefreshCw, DollarSign, Gem, Rocket, MessageSquare, Heart, Film, Sparkles, LayoutGrid, Users } from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';

const AdminPricing: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<any>(null);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<any>('/api/admin/pricing', { requireAuth: true });
      setPricing(data);
    } catch (error) {
      showAlert('Erreur', 'Impossible de charger les tarifs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const handleUpdate = async () => {
    try {
      setSaving(true);
      await apiRequest('/api/admin/pricing', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(pricing)
      });
      showAlert('Succès', 'Les tarifs ont été mis à jour.');
    } catch (error) {
      showAlert('Erreur', 'Échec de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (category: string, key: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setPricing((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: numValue
      }
    }));
  };

  const updateNestedField = (category: string, key: string, field: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setPricing((prev: any) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [key]: {
          ...(prev[category]?.[key] || {}),
          [field]: numValue
        }
      }
    }));
  };

  if (loading) return <div className="p-10 text-center"><RefreshCw className="animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6 lg:space-y-10 max-w-4xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white transition-colors">Gestion des Tarifs</h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2 transition-colors">Configurez les coûts de l'écosystème Galant</p>
        </div>
        <button
          onClick={handleUpdate}
          disabled={saving}
          className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
          Enregistrer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Interactions Individuelles */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl dark:shadow-none border border-slate-100 dark:border-white/5 space-y-6 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-xl flex items-center justify-center text-primary transition-colors">
              <Heart size={20} />
            </div>
            <h3 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-white transition-colors">Interactions</h3>
          </div>

          <div className="space-y-4">
            {[
              { id: 'SUPER_LIKE', label: 'Rose envoyee', icon: Heart },
              { id: 'DIRECT_MESSAGE', label: 'Message Direct', icon: MessageSquare },
              { id: 'ROSE_NOTE_UNLOCK', label: 'Note Parfumée', icon: Sparkles },
              { id: 'GOLDEN_ROSE', label: 'Rose d Or visibilite (3h)', icon: Gem },
              { id: 'STORY_UPLOAD', label: 'Publication Story', icon: Film },
              { id: 'LIKES_INBOX_2H', label: 'Déblocage Likes (2h)', icon: Heart },
              { id: 'DISCOVER_GRID_UNLOCK', label: 'Déblocage Galerie (Prix)', icon: LayoutGrid },
              { id: 'GRID_QUOTA', label: 'Galerie : Nombre de profils', icon: Users }
            ].map(item => (
              <div key={item.id} className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">{item.label}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={pricing.PRICES[item.id]}
                    onChange={(e) => updateField('PRICES', item.id, e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 font-bold text-slate-900 dark:text-white transition-colors"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 font-bold text-xs transition-colors">F</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Packs de Roses */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl dark:shadow-none border border-slate-100 dark:border-white/5 space-y-6 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-500 transition-colors">
              <Gem size={20} />
            </div>
            <h3 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-white transition-colors">Packs Solde Roses</h3>
          </div>

          <div className="space-y-4">
            {[
              { id: 'ROSE_1', label: '1 Rose a consommer' },
              { id: 'ROSE_5', label: '5 Roses a consommer' },
              { id: 'ROSE_10', label: '10 Roses a consommer' }
            ].map(item => (
              <div key={item.id} className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">{item.label}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={pricing.ROSE_PACKS?.[item.id]?.amount ?? 0}
                    onChange={(e) => updateNestedField('ROSE_PACKS', item.id, 'amount', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 font-bold text-slate-900 dark:text-white transition-colors"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 font-bold text-xs transition-colors">F</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Abonnements */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl dark:shadow-none border border-slate-100 dark:border-white/5 space-y-6 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-500 transition-colors">
              <Gem size={20} />
            </div>
            <h3 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-white transition-colors">Abonnements</h3>
          </div>

          <div className="space-y-4">
            {[
              { id: 'MONTHLY', label: 'Mensuel (1 mois)', cat: 'PLAN_AMOUNTS' },
              { id: 'QUARTERLY', label: 'Trimestriel (3 mois)', cat: 'PLAN_AMOUNTS' },
              { id: 'VISIBILITY', label: 'Partenaire - Visibilité', cat: 'PARTNER_PLAN_AMOUNTS' },
              { id: 'PRESTIGE', label: 'Partenaire - Prestige', cat: 'PARTNER_PLAN_AMOUNTS' }
            ].map(item => (
              <div key={item.id} className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">{item.label}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={pricing[item.cat][item.id]}
                    onChange={(e) => updateField(item.cat, item.id, e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 font-bold text-slate-900 dark:text-white transition-colors"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 font-bold text-xs transition-colors">F</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPricing;
