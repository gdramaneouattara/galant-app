import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, COLLECTIONS } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { MapPin, Navigation, Loader2, ChevronRight, Globe } from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';

const LocationSetupPage: React.FC = () => {
  const { user, profile } = useAuth();
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
      const userRef = doc(db, COLLECTIONS.PROFILES, user.uid);
      await updateDoc(userRef, {
        latitude: lat,
        longitude: lon,
        city: city,
        country: country,
        onboarding_completed: true, // On finalise l'onboarding ici pour le web
        updated_at: new Date().toISOString()
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
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-10 text-center space-y-8">
        <div className="w-20 h-20 bg-rose-50 text-primary rounded-[2rem] flex items-center justify-center mx-auto shadow-lg animate-pulse">
          <MapPin size={40} />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black italic tracking-tighter">Où êtes-vous ?</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Galant utilise votre position pour vous proposer les profils les plus proches et les meilleurs lieux de rendez-vous.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <button
            onClick={handleGeoLocation}
            disabled={loading}
            className="w-full bg-primary text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-red-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Navigation size={20} />}
            Autoriser le GPS
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px bg-slate-100 flex-1"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">OU</span>
            <div className="h-px bg-slate-100 flex-1"></div>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder="Saisir votre ville manuellement"
                className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 font-medium text-sm text-center"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !manualCity.trim()}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-30"
            >
              <Globe size={16} />
              Valider la ville
            </button>
          </form>
        </div>

        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter pt-4">
          Vous pourrez changer de ville plus tard avec le Mode Voyage 💎
        </p>
      </div>
    </div>
  );
};

export default LocationSetupPage;
