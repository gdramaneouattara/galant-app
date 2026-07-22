import React, { useEffect, useState } from 'react';
import { apiRequest } from '@shared/lib/api';
import { Save, RefreshCcw, DollarSign, Gem, Rocket, MessageSquare, Heart, Film, Sparkles } from 'lucide-react';
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

  if (loading) return <div className="p-10 text-center"><RefreshCcw className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-8 space-y-10 max-w-4xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter">Gestion des Tarifs</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Configurez les coûts de l'écosystème Galant</p>
        </div>
        <button
          onClick={handleUpdate}
          disabled={saving}
          className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? <RefreshCcw className="animate-spin" size={16} /> : <Save size={16} />}
          Enregistrer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Interactions Individuelles */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-primary">
              <Heart size={20} />
            </div>
            <h3 className="font-black text-lg uppercase tracking-tight">Interactions</h3>
          </div>

          <div className="space-y-4">
            {[
              { id: 'SUPER_LIKE', label: 'Rose d\'Or (Super Like)', icon: Heart },
              { id: 'DIRECT_MESSAGE', label: 'Message Direct', icon: MessageSquare },
              { id: 'ROSE_NOTE_UNLOCK', label: 'Note Parfumée', icon: Sparkles },
              { id: 'GOLDEN_ROSE', label: 'Bouquet Royal (3h)', icon: Gem },
              { id: 'STORY_UPLOAD', label: 'Publication Story', icon: Film }
            ].map(item => (
              <div key={item.id} className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={pricing.PRICES[item.id]}
                    onChange={(e) => updateField('PRICES', item.id, e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl py-3 pl-10 pr-4 font-bold text-slate-900"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">F</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Abonnements */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
              <Gem size={20} />
            </div>
            <h3 className="font-black text-lg uppercase tracking-tight">Abonnements</h3>
          </div>

          <div className="space-y-4">
            {[
              { id: 'MONTHLY', label: 'Mensuel (1 mois)', cat: 'PLAN_AMOUNTS' },
              { id: 'QUARTERLY', label: 'Trimestriel (3 mois)', cat: 'PLAN_AMOUNTS' },
              { id: 'VISIBILITY', label: 'Partenaire - Visibilité', cat: 'PARTNER_PLAN_AMOUNTS' },
              { id: 'PRESTIGE', label: 'Partenaire - Prestige', cat: 'PARTNER_PLAN_AMOUNTS' }
            ].map(item => (
              <div key={item.id} className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={pricing[item.cat][item.id]}
                    onChange={(e) => updateField(item.cat, item.id, e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl py-3 pl-10 pr-4 font-bold text-slate-900"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">F</span>
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
