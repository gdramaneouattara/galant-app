import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Globe, Search, Plane, Loader2, ChevronRight } from 'lucide-react';
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
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [visualViewportStyle, setVisualViewportStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isOpen || !isInputFocused || typeof window === 'undefined' || !window.visualViewport) {
      setVisualViewportStyle({});
      return;
    }

    const viewport = window.visualViewport;
    const updateViewportStyle = () => {
      setVisualViewportStyle({
        top: `${viewport.offsetTop}px`,
        height: `${viewport.height}px`
      });
    };

    updateViewportStyle();
    viewport.addEventListener('resize', updateViewportStyle);
    viewport.addEventListener('scroll', updateViewportStyle);

    return () => {
      viewport.removeEventListener('resize', updateViewportStyle);
      viewport.removeEventListener('scroll', updateViewportStyle);
    };
  }, [isOpen, isInputFocused]);

  if (!isOpen) return null;

  const searchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    const cityQuery = (query || '').trim();
    if (!cityQuery) return;

    setLoading(true);
    try {
      // Simulation simple ou appel API de géocodage (ex: Nominatim OpenStreetMap)
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}&addressdetails=1&limit=1`);
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

  const handleModalBlur = () => {
    window.setTimeout(() => {
      const activeElement = document.activeElement;
      if (!modalRef.current || !activeElement || !modalRef.current.contains(activeElement)) {
        setIsInputFocused(false);
      }
    }, 0);
  };

  const overlayClassName = [
    'fixed left-0 right-0 z-[220] bg-slate-900/70 backdrop-blur-sm flex px-4',
    isInputFocused ? 'top-0 h-[100dvh] items-end justify-center pt-3 pb-2' : 'inset-y-0 items-center justify-center py-3'
  ].join(' ');
  const modalClassName = [
    'bg-white w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300',
    isInputFocused
      ? 'max-h-[calc(100%-0.75rem)] rounded-t-[1.75rem] rounded-b-[1.25rem]'
      : 'max-h-[calc(100dvh-2rem)] rounded-[2rem] md:rounded-[2.5rem]'
  ].join(' ');
  const contentClassName = [
    'overflow-y-auto overscroll-contain',
    isInputFocused ? 'p-4 space-y-3 max-h-[calc(100%-0.75rem)]' : 'p-5 sm:p-8 space-y-4 sm:space-y-6 max-h-[calc(100dvh-2rem)]'
  ].join(' ');

  const modal = (
    <div className={overlayClassName} style={isInputFocused ? visualViewportStyle : undefined}>
      <div
        ref={modalRef}
        className={modalClassName}
        onFocusCapture={() => setIsInputFocused(true)}
        onBlurCapture={handleModalBlur}
      >
        <div className={contentClassName}>
          {/* Header */}
          <div className="sticky top-0 z-10 -mx-1 flex justify-between items-start gap-3 bg-white px-1 pb-1">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              <div className={`${isInputFocused ? 'w-9 h-9 rounded-xl' : 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl'} bg-rose-50 text-primary flex items-center justify-center shrink-0 transition-all`}>
                <Plane size={isInputFocused ? 18 : 22} />
              </div>
              <div className="min-w-0">
                <h2 className={`${isInputFocused ? 'text-base' : 'text-lg sm:text-xl'} leading-tight font-black`}>{t('passport_galant')}</h2>
                <p className={`${isInputFocused ? 'line-clamp-2 text-[10px]' : 'text-[11px] sm:text-xs'} leading-relaxed font-medium text-slate-500`}>{t('passport_desc')}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-300 transition-colors shrink-0">
              <X size={isInputFocused ? 20 : 22} />
            </button>
          </div>

          {/* Benefits */}
          <div className={`${isInputFocused ? 'hidden' : 'flex'} flex-wrap gap-2`}>
            {[t('passport_benefit_1'), t('passport_benefit_2')].map((b, i) => (
              <span key={i} className="bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-tighter border border-slate-100">
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
              onFocus={() => setIsInputFocused(true)}
              placeholder={t('search_city')}
              className="w-full bg-slate-50 border-none px-11 py-3.5 sm:px-12 sm:py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium text-sm sm:text-base"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <button
              type="submit"
              disabled={loading}
              onMouseDown={(event) => event.preventDefault()}
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
                className="w-full flex items-center justify-between p-3.5 sm:p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors text-left group"
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
              className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors"
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

  return createPortal(modal, document.body);
};
export default PassportModal;
