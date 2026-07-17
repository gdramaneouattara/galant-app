import React, { useState } from 'react';
import { X, MapPin, Globe, Search, Plane, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';
import { db, COLLECTIONS } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PassportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, profile, t } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  if (!isOpen) return null;

  const searchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Simulation simple ou appel API de géocodage (ex: Nominatim OpenStreetMap)
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        const place = data[0];
        setResults([{
          city: place.address.city || place.address.town || place.address.village || place.display_name.split(',')[0],
          country: place.address.country || '',
          latitude: parseFloat(place.lat),
          longitude: parseFloat(place.lon)
        }]);
      } else {
        showAlert('Oups', 'Ville introuvable. Soyez plus précis.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCity = async (cityData: any) => {
    if (!user) return;
    setUpdating(true);
    try {
      const userRef = doc(db, COLLECTIONS.PROFILES, user.uid);
      const updates = {
        passport_city: cityData.city,
        passport_country: cityData.country,
        passport_latitude: cityData.latitude,
        passport_longitude: cityData.longitude,
        is_passport_active: true,
        updated_at: new Date().toISOString()
      };

      await updateDoc(userRef, updates);
      showAlert('Bon voyage !', `Votre position est maintenant fixée à ${cityData.city}.`);
      onClose();
      window.location.reload(); // Recharger pour rafraîchir les suggestions
    } catch (error: any) {
      showAlert('Erreur', error.message);
    } finally {
      setUpdating(false);
    }
  };

  const deactivatePassport = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      const userRef = doc(db, COLLECTIONS.PROFILES, user.uid);
      await updateDoc(userRef, {
        passport_city: null,
        passport_country: null,
        passport_latitude: null,
        passport_longitude: null,
        is_passport_active: false,
        updated_at: new Date().toISOString()
      });
      showAlert('Retour au pays', 'Vous utilisez à nouveau votre position réelle.');
      onClose();
      window.location.reload();
    } catch (error: any) {
      showAlert('Erreur', error.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 text-primary rounded-2xl flex items-center justify-center">
                <Plane size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black italic">{t('passport_galant')}</h2>
                <p className="text-xs font-medium text-slate-500">{t('passport_desc')}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-300 transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Benefits */}
          <div className="flex flex-wrap gap-2">
            {[t('passport_benefit_1'), t('passport_benefit_2')].map((b, i) => (
              <span key={i} className="bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter italic border border-slate-100">
                {b}
              </span>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={searchCity} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search_city')}
              className="w-full bg-slate-50 border-none px-12 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white p-2 rounded-xl shadow-sm text-primary hover:scale-105 active:scale-95 transition-all"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <ChevronRight size={20} />}
            </button>
          </form>

          {/* Results */}
          <div className="space-y-2">
            {results.map((res, i) => (
              <button
                key={i}
                onClick={() => handleSelectCity(res)}
                disabled={updating}
                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <MapPin size={20} className="text-primary" />
                  <div>
                    <p className="font-bold text-slate-900">{res.city}</p>
                    <p className="text-xs text-slate-500 font-medium">{res.country}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity">SÉLECTIONNER</span>
              </button>
            ))}
          </div>

          {profile?.passport_city && (
            <button
              onClick={deactivatePassport}
              disabled={updating}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors"
            >
              <Globe size={16} />
              {t('deactivate_passport')}
            </button>
          )}

          {updating && (
            <div className="flex justify-center">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import { ChevronRight } from 'lucide-react';
export default PassportModal;
