import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fbAuth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';
import { Building2, Mail, Lock, MapPin, Tag, ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const VENUE_TYPES = [
  { value: 'HOTEL', label: 'Hôtel' },
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'LOUNGE', label: 'Lounge / Bar' },
  { value: 'NIGHTCLUB', label: 'Club' },
];

const PartnerSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    venueName: '',
    venueType: 'LOUNGE',
    city: 'Douala',
    address: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Créer le compte Auth
      const cred = await createUserWithEmailAndPassword(fbAuth, form.email, form.password);

      // 2. Créer le profil partenaire et la fiche établissement via l'API
      await apiRequest('/api/auth/complete-partner-profile', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          name: form.name,
          venueName: form.venueName,
          venueType: form.venueType,
          city: form.city,
          address: form.address
        })
      });

      showAlert('Demande envoyée', 'Votre demande de partenariat est en cours de revue. Notre équipe vous contactera sous 24h.');
      navigate('/');
    } catch (error: any) {
      showAlert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <button onClick={() => navigate('/auth')} className="mb-6 flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-primary transition-colors">
        <ChevronLeft size={20} /> RETOUR
      </button>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-10 text-white text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/20">
            <Building2 size={32} />
          </div>
          <h2 className="text-3xl font-black italic tracking-tighter">Galant Business</h2>
          <p className="text-slate-400 mt-2 font-medium">Propulsez votre établissement vers une clientèle d'exception.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-400 ml-1">Nom du Responsable</label>
              <input
                type="text" required
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 font-medium"
                placeholder="Votre nom complet"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-400 ml-1">Email Professionnel</label>
              <input
                type="email" required
                value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 font-medium"
                placeholder="contact@etablissement.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 ml-1">Mot de passe</label>
            <input
              type="password" required
              value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 font-medium"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 ml-1">Nom de l'établissement</label>
                <input
                  type="text" required
                  value={form.venueName} onChange={e => setForm({...form, venueName: e.target.value})}
                  className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 font-medium"
                  placeholder="Ex: Sky Lounge"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 ml-1">Type de lieu</label>
                <select
                  value={form.venueType} onChange={e => setForm({...form, venueType: e.target.value})}
                  className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl outline-none font-bold text-sm text-slate-700"
                >
                  {VENUE_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-400 ml-1">Adresse exacte</label>
              <div className="relative">
                <input
                  type="text" required
                  value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                  className="w-full bg-slate-50 border-none px-12 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 font-medium"
                  placeholder="Quartier, Rue..."
                />
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              </div>
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-lg shadow-xl shadow-slate-200 hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'DEMANDER L\'ACCÈS PARTENAIRE'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PartnerSignupPage;
