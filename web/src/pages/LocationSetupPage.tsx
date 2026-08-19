import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, Navigation, Loader2, Globe } from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';
import { apiRequest } from '@shared/lib/api';

const LocationSetupPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [manualCity, setManualCity] = useState('');

  const handleGeoLocation = () => {
    if (!navigator.geolocation) {
      showAlert('Erreur', 'La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Appel au reverse geocoding pour obtenir le nom de la ville
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || 'Cameroun';
          const country = data.address.country || 'Cameroun';

          await saveLocation(latitude, longitude, city, country);
        } catch (error) {
          console.error(error);
          // Si le reverse geocoding échoue, on sauvegarde au moins les points GPS
          await saveLocation(latitude, longitude, 'Ville détectée', 'Cameroun');
        }
      },
      (error) => {
        setLoading(false);
        let msg = 'Impossible de récupérer votre position.';
        if (error.code === 1) msg = 'Veuillez autoriser l\'accès à la position dans votre navigateur.';
        showAlert('Position refusée', msg);
      }
    );
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const city = (manualCity || '').trim();
    if (!city) return;
    setLoading(true);
    try {
      // Geocoding de la ville saisie manuellement
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        await saveLocation(parseFloat(data[0].lat), parseFloat(data[0].lon), city, 'Cameroun');
      } else {
        showAlert('Oups', 'Ville introuvable. Veuillez réessayer.');
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      showAlert('Erreur', 'Service de localisation indisponible.');
    }
  };

  const saveLocation = async (lat: number, lon: number, city: string, country: string) => {
    if (!user) return;
    try {
      await apiRequest('/api/profiles/update', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          city: city,
          country: country,
          onboarding_completed: true // On finalise l'onboarding ici pour le web
        })
      });
      showAlert('Bienvenue', `Votre position à ${city} a été enregistrée.`);
      navigate('/');
    } catch (error: any) {
      showAlert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl dark:shadow-none border border-slate-100 dark:border-white/5 p-10 text-center space-y-8 transition-colors">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-primary rounded-[2rem] flex items-center justify-center mx-auto shadow-lg animate-pulse transition-colors">
          <MapPin size={40} />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black  tracking-tighter text-slate-900 dark:text-white transition-colors">Où êtes-vous ?</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed transition-colors">
            Galant utilise votre position pour vous proposer les profils les plus proches et les meilleurs lieux de rendez-vous.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <button
            onClick={handleGeoLocation}
            disabled={loading}
            className="w-full bg-primary text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-red-100 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Navigation size={20} />}
            Autoriser le GPS
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-slate-100 dark:bg-white/5 flex-1 transition-colors"></div>
            <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest transition-colors">OU</span>
            <div className="h-px bg-slate-100 dark:bg-white/5 flex-1 transition-colors"></div>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder="Saisir votre ville manuellement"
                className="w-full bg-slate-50 dark:bg-slate-800 border-none px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 font-medium text-sm text-center text-slate-900 dark:text-white transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !manualCity.trim()}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black dark:hover:bg-slate-100 transition-all disabled:opacity-30"
            >
              <Globe size={16} />
              Valider la ville
            </button>
          </form>
        </div>

        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter pt-4 transition-colors">
          Vous pourrez changer de ville plus tard avec le Mode Voyage 💎
        </p>
      </div>
    </div>
  );
};

export default LocationSetupPage;
