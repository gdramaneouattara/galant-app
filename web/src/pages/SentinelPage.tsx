import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '@shared/lib/api';
import { Shield, PhoneIncoming, Clock, CheckCircle, ChevronLeft, X, Phone, User, AlertTriangle, Loader2, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showAlert } from '@shared/lib/ui-bridge';

const SentinelPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCallerPhoto(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSOS = async () => {
    if (!window.confirm("Voulez-vous déclencher une ALERTE SOS immédiate à vos contacts ?")) return;

    setLoading(true);
    try {
      await apiRequest('/api/security/sos', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          contactName: 'Contact d\'Urgence',
          contactNumber: '+225 0000000000'
        })
      });
      showAlert('⚠️ SOS DÉCLENCHÉ', 'Votre alerte a été envoyée avec priorité absolue.');
    } catch (e: any) {
      showAlert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleCheckIn = async (mins: number) => {
    setLoading(true);
    try {
      const res = await apiRequest<any>('/api/security/schedule', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          durationMinutes: mins,
          contactName: 'Contact d\'Urgence',
          contactNumber: '+225 0000000000'
        })
      });
      setActiveTimer(res);
      showAlert('La Sentinelle Active 🛡️', `Nous vous demanderons de confirmer votre sécurité dans ${mins} minutes.`);
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
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-slate-50 dark:border-white/5 space-y-6">
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
          <div className="space-y-4">
            <p className="text-slate-500 text-sm font-medium leading-relaxed text-center">
              Programmez un rappel de sécurité. Sans confirmation, nous alerterons vos proches.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[15, 30, 60].map(mins => (
                <button
                  key={mins}
                  onClick={() => handleScheduleCheckIn(mins)}
                  disabled={loading}
                  className="bg-slate-50 dark:bg-white/5 hover:bg-primary hover:text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-blue-50/50 dark:bg-blue-500/10 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-500/20 text-center space-y-4">
            <div className="relative w-20 h-20 mx-auto">
              <Clock className="text-blue-500 w-full h-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-black text-blue-600 mt-2">{timeLeft ? formatDuration(timeLeft) : '--:--'}</span>
              </div>
            </div>
            <p className="text-blue-900 dark:text-blue-300 font-black text-[10px] uppercase tracking-widest">Temps restant avant alerte</p>
            <button
              onClick={handleConfirmSafety}
              className="w-full bg-blue-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} /> Je vais bien
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
                  <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </div>
                <input
                  type="text"
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  placeholder="Ex: Bureau, Maman..."
                  className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-1 focus:ring-primary/50 outline-none"
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
