import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '@shared/lib/api';
import { Shield, PhoneIncoming, Clock, CheckCircle, ChevronLeft, X, Phone, User, AlertTriangle, Loader2, Camera, Plus, Trash2, MapPin, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '@shared/lib/ui-bridge';

interface SentinelContact {
  name: string;
  number: string;
}

const SentinelPage: React.FC = () => {
  const { profile, reloadUser } = useAuth();
  const navigate = useNavigate();
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Duration State
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);

  // Contacts State
  const [contacts, setContacts] = useState<SentinelContact[]>(profile?.emergency_contacts || []);
  const [manualName, setManualName] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isSavingContacts, setIsSavingContacts] = useState(false);

  // Meeting Details State
  const [location, setLocation] = useState('');
  const [personName, setPersonName] = useState('');
  const [personContact, setPersonContact] = useState('');

  // Sync contacts with profile if updated externally
  useEffect(() => {
    if (profile?.id) {
      // RESET ALL STATES FOR NEW USER
      setContacts(profile.emergency_contacts || []);
      setLocation('');
      setPersonName('');
      setPersonContact('');
      setActiveTimer(null);
      setTimeLeft(null);
    } else {
      setContacts([]);
    }
  }, [profile?.id]);

  // Fake Call State
  const [isFakeCallActive, setIsFakeCallActive] = useState(false);
  const [isFakeCallRinging, setIsFakeCallRinging] = useState(false);
  const [callerName, setCallerName] = useState('Bureau');
  const [callerPhoto, setCallerPhoto] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const [loading, setLoading] = useState(false);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Time remaining calculator
  useEffect(() => {
    let interval: any;
    if (activeTimer && activeTimer.expiresAt) {
      interval = setInterval(() => {
        const diff = Math.max(0, Math.floor((new Date(activeTimer.expiresAt).getTime() - Date.now()) / 1000));
        setTimeLeft(diff);
        if (diff === 0) {
           setActiveTimer(null);
           showAlert('Alerte !', 'Votre délai de sécurité est expiré. La Sentinelle a été déclenchée.');
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Fake call timer
  useEffect(() => {
    let interval: any;
    if (isFakeCallActive && !isFakeCallRinging) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFakeCallActive, isFakeCallRinging]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const triggerFakeCall = () => {
    setIsFakeCallRinging(true);
    setIsFakeCallActive(true);
    if (ringtoneRef.current) {
       ringtoneRef.current.loop = true;
       ringtoneRef.current.play().catch(() => {});
    }
  };

  const acceptCall = () => {
    setIsFakeCallRinging(false);
    if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
    }
  };

  const endCall = () => {
    setIsFakeCallActive(false);
    setIsFakeCallRinging(false);
    setCallDuration(0);
    if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCallerPhoto(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePickContact = async () => {
    if (contacts.length >= 2) return;

    // Try Contact Picker API
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        const results = await (navigator as any).contacts.select(props, opts);

        if (results && results.length > 0) {
          const contact = results[0];
          const name = contact.name?.[0] || 'Contact';
          const number = contact.tel?.[0] || '';
          if (number) {
            setContacts(prev => [...prev, { name, number }]);
            return;
          }
        }
      } catch (e) {
        console.warn('Contact picker failed, falling back to manual', e);
      }
    }

    // Fallback to manual entry
    setShowManualEntry(true);
  };

  const addManualContact = () => {
    if (manualName && manualNumber) {
      setContacts(prev => [...prev, { name: manualName, number: manualNumber }]);
      setManualName('');
      setManualNumber('');
      setShowManualEntry(false);
    }
  };

  const removeContact = (index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
  };

  const saveContactsPermanently = async () => {
    setIsSavingContacts(true);
    try {
      await apiRequest('/api/profiles/update', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ emergency_contacts: contacts })
      });
      await reloadUser();
      showAlert('Enregistré', 'Vos contacts de confiance ont été sauvegardés de façon permanente.');
    } catch (e: any) {
      showAlert('Erreur', e.message);
    } finally {
      setIsSavingContacts(false);
    }
  };

  const getCurrentGPS = (): Promise<{ lat: number, lon: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  };

  const handleSOS = async () => {
    if (contacts.length === 0) {
      showAlert('Attention', 'Veuillez ajouter au moins un contact de confiance avant de lancer un SOS.');
      return;
    }
    if (!window.confirm("Voulez-vous déclencher une ALERTE SOS immédiate à vos contacts ?")) return;

    setLoading(true);
    try {
      const gps = await getCurrentGPS();
      await apiRequest('/api/security/sos', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          contacts,
          location: gps,
          meetingDetails: {
            location,
            personName,
            personContact
          }
        })
      });
      showAlert('⚠️ SOS DÉCLENCHÉ', 'Votre alerte a été envoyée avec priorité absolue.');
    } catch (e: any) {
      showAlert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleCheckIn = async () => {
    const totalMins = hours * 60 + minutes;
    if (totalMins <= 0) {
      showAlert('Attention', 'Veuillez définir une durée valide.');
      return;
    }
    if (contacts.length === 0) {
      showAlert('Attention', 'Veuillez ajouter au moins un contact de confiance.');
      return;
    }

    setLoading(true);
    try {
      const gps = await getCurrentGPS();
      const res = await apiRequest<any>('/api/security/schedule', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          durationMinutes: totalMins,
          contacts,
          location: gps,
          meetingDetails: {
            location,
            personName,
            personContact
          }
        })
      });
      setActiveTimer(res);
      showAlert('La Sentinelle Active 🛡️', `Nous veillerons sur vous pendant les prochaines ${hours > 0 ? hours + 'h' : ''}${minutes}min.`);
    } catch (e: any) {
      showAlert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSafety = async () => {
    if (!activeTimer) return;
    setLoading(true);
    try {
      await apiRequest('/api/security/confirm', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ logId: activeTimer.logId })
      });
      setActiveTimer(null);
      showAlert('Terminé', 'Votre sécurité a été confirmée. Le timer est désactivé.');
    } catch (e: any) {
      showAlert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pb-24 px-4 space-y-10 relative">
      <audio ref={ringtoneRef} src="https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3" />

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/apps')}
          className="p-3 bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-white/10 rounded-2xl text-slate-400 hover:text-primary transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-[1000] italic tracking-tight text-slate-900 dark:text-white">La Sentinelle</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sécurité & Discrétion Galante</p>
        </div>
      </div>

      {/* Check-in Card */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-slate-50 dark:border-white/5 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
              <Shield size={24} />
            </div>
            <h3 className="font-black text-xl italic">Sécurité Active</h3>
          </div>
          <button
            onClick={handleSOS}
            disabled={loading}
            className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 animate-pulse hover:scale-110 transition-all"
          >
            <AlertTriangle size={24} />
          </button>
        </div>

        {!activeTimer ? (
          <div className="space-y-6">
            {/* Duration Selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Durée de la veille</label>
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-3xl">
                <div className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase">Heures</span>
                  <input
                    type="number"
                    value={hours}
                    onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent text-center font-black text-2xl outline-none"
                  />
                </div>
                <div className="text-slate-200 font-black text-2xl">:</div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase">Minutes</span>
                  <input
                    type="number"
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-full bg-transparent text-center font-black text-2xl outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Contacts Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contacts (Max 2)</label>
                <div className="flex gap-4">
                   {contacts.length > 0 && contacts.length <= 2 && (
                     <button
                       onClick={saveContactsPermanently}
                       disabled={isSavingContacts}
                       className="text-[10px] font-black text-green-500 uppercase flex items-center gap-1 hover:underline disabled:opacity-50"
                     >
                       {isSavingContacts ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Sauvegarder
                     </button>
                   )}
                   {contacts.length < 2 && (
                     <button
                       onClick={handlePickContact}
                       className="text-[10px] font-black text-primary uppercase flex items-center gap-1 hover:underline"
                     >
                       <Plus size={12} /> Ajouter
                     </button>
                   )}
                </div>
              </div>

              {showManualEntry && (
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl space-y-3 animate-in slide-in-from-top-2">
                  <input
                    placeholder="Nom du contact"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                  />
                  <input
                    placeholder="Numéro (ex: +225...)"
                    value={manualNumber}
                    onChange={(e) => setManualNumber(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowManualEntry(false)} className="flex-1 py-2 text-xs font-bold text-slate-400">Annuler</button>
                    <button onClick={addManualContact} className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-black">Ajouter</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {contacts.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic text-center py-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl">
                    Aucun contact sélectionné
                  </p>
                ) : (
                  contacts.map((c, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-3 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                          <User size={14} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black truncate">{c.name}</p>
                          <p className="text-[9px] font-bold text-slate-400">{c.number}</p>
                        </div>
                      </div>
                      <button onClick={() => removeContact(i)} className="p-2 text-slate-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Meeting Details Section */}
            <div className="space-y-4 pt-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Détails du rendez-vous (Optionnel)</label>
              <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[2rem] space-y-4">
                <div className="space-y-1">
                   <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase ml-1">
                     <MapPin size={10} /> Lieu
                   </div>
                   <input
                    placeholder="Où êtes-vous ?"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                   />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase ml-1">
                      <User size={10} /> Nom de la personne
                    </div>
                    <input
                      placeholder="Rencontré(e)"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase ml-1">
                      <Phone size={10} /> Son Contact
                    </div>
                    <input
                      placeholder="Numéro"
                      value={personContact}
                      onChange={(e) => setPersonContact(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleScheduleCheckIn}
              disabled={loading || contacts.length === 0}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl disabled:opacity-50 transition-all hover:scale-[1.02]"
            >
              Activer la Protection
            </button>
          </div>
        ) : (
          <div className="bg-blue-50/50 dark:bg-blue-500/10 p-8 rounded-[2rem] border border-blue-100 dark:border-blue-500/20 text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <Clock className="text-blue-500 w-full h-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-black text-blue-600 mt-2">{timeLeft ? formatDuration(timeLeft) : '--:--'}</span>
              </div>
            </div>
            <div>
              <p className="text-blue-900 dark:text-blue-300 font-black text-[10px] uppercase tracking-widest mb-1">Protection Active</p>
              <p className="text-slate-400 text-[9px] font-bold uppercase">Alerte auto à {new Date(activeTimer.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <button
              onClick={handleConfirmSafety}
              className="w-full bg-blue-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <CheckCircle size={18} /> Je vais bien
            </button>
          </div>
        )}
      </div>

      {/* Fake Call Card */}
      <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl text-white space-y-8 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 text-primary rounded-2xl flex items-center justify-center">
            <PhoneIncoming size={24} />
          </div>
          <h3 className="font-black text-xl italic">Appel Fantôme</h3>
        </div>

        <div className="space-y-6 relative z-10">
          <div className="space-y-4">
            <div>
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Qui vous appelle ?</label>
              <div className="flex gap-3 mt-1">
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-white/5 cursor-pointer overflow-hidden"
                >
                  {callerPhoto ? <img src={callerPhoto} className="w-full h-full object-cover" /> : <Camera size={20} className="text-slate-600" />}
                  <input type="file" className="hidden" ref={photoInputRef} accept="image/*" onChange={handlePhotoUpload} />
                </div>
                <input
                  type="text"
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  placeholder="Ex: Bureau, Maman..."
                  className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-1 focus:ring-primary/50 outline-none text-white"
                />
              </div>
            </div>
          </div>

          <button
            onClick={triggerFakeCall}
            className="w-full bg-white text-slate-900 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            Lancer la Simulation
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-500/10 text-amber-600 dark:text-amber-500">
        <AlertTriangle size={20} className="flex-shrink-0" />
        <p className="text-[10px] font-bold uppercase tracking-tight leading-relaxed">
          Pour une efficacité maximale, assurez-vous que le son de votre téléphone est activé avant de lancer l'appel.
        </p>
      </div>

      {/* --- FAKE CALL OVERLAY --- */}
      {isFakeCallActive && (
        <div className="fixed inset-0 z-[200] bg-slate-900 animate-in fade-in duration-300 flex flex-col justify-between py-20 px-10 text-white font-sans">
          <div className="flex flex-col items-center gap-6 mt-10">
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/5 overflow-hidden">
              {callerPhoto ? <img src={callerPhoto} className="w-full h-full object-cover" /> : <User size={48} className="text-slate-500" />}
            </div>
            <div className="text-center">
              <h4 className="text-3xl font-medium mb-2">{callerName}</h4>
              <p className="text-slate-400 font-medium tracking-wide">
                {isFakeCallRinging ? 'Appel entrant...' : formatDuration(callDuration)}
              </p>
            </div>
          </div>

          <div className="flex justify-around mb-10">
            {isFakeCallRinging ? (
              <>
                <button
                  onClick={endCall}
                  className="flex flex-col items-center gap-3 group"
                >
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg group-active:scale-90 transition-transform">
                    <Phone className="rotate-[135deg]" size={28} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Refuser</span>
                </button>
                <button
                  onClick={acceptCall}
                  className="flex flex-col items-center gap-3 group"
                >
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg group-active:scale-90 transition-transform">
                    <Phone size={28} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Accepter</span>
                </button>
              </>
            ) : (
              <button
                onClick={endCall}
                className="flex flex-col items-center gap-3 group"
              >
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg group-active:scale-90 transition-transform">
                  <Phone className="rotate-[135deg]" size={28} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Raccrocher</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SentinelPage;
