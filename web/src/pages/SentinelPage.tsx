import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '@shared/lib/api';
import { Shield, PhoneIncoming, Clock, CheckCircle, ChevronLeft, X, Phone, User, AlertTriangle, Loader2, Camera, Plus, Trash2, MapPin, Save, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '@shared/lib/ui-bridge';

interface SentinelContact {
  name: string;
  number: string;
}

const SentinelPage: React.FC = () => {
  const { profile, reloadUser, isFakeCallActive, setIsFakeCallActive, t } = useAuth();
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSavingContacts, setIsSavingContacts] = useState(false);

  const isDirty = JSON.stringify(contacts) !== JSON.stringify(profile?.emergency_contacts || []);

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
  const [isFakeCallRinging, setIsFakeCallRinging] = useState(false);
  const [fakeCallDelay, setFakeCallDelay] = useState(0);
  const [isFakeCallScheduled, setIsFakeCallScheduled] = useState(false);
  const [scheduledSecondsLeft, setScheduledSecondsLeft] = useState<number | null>(null);
  const [callerName, setCallerName] = useState('Bureau');
  const [callerPhoto, setCallerPhoto] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const [loading, setLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneTimerRef = useRef<number | null>(null);
  const activeOscillatorsRef = useRef<OscillatorNode[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const stopRingtone = () => {
    if (ringtoneTimerRef.current !== null) {
      window.clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }

    activeOscillatorsRef.current.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        // Already stopped.
      }
    });
    activeOscillatorsRef.current = [];
  };

  const playRingtonePulse = () => {
    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;

      const audioContext = audioContextRef.current || new AudioContextCtor();
      audioContextRef.current = audioContext;
      if (audioContext.state === 'suspended') {
        void audioContext.resume();
      }

      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.75);
      gain.connect(audioContext.destination);

      [660, 880].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + index * 0.12);
        oscillator.connect(gain);
        oscillator.start(audioContext.currentTime + index * 0.12);
        oscillator.stop(audioContext.currentTime + 0.8);
        activeOscillatorsRef.current.push(oscillator);
        oscillator.onended = () => {
          activeOscillatorsRef.current = activeOscillatorsRef.current.filter((item) => item !== oscillator);
        };
      });
    } catch {
      // Browsers can block audio in some contexts; the visual call screen remains usable.
    }
  };

  const startRingtone = () => {
    stopRingtone();
    playRingtonePulse();
    ringtoneTimerRef.current = window.setInterval(playRingtonePulse, 1600);
  };

  // Time remaining calculator
  useEffect(() => {
    let interval: any;
    if (activeTimer && activeTimer.expiresAt) {
      interval = setInterval(() => {
        const diff = Math.max(0, Math.floor((new Date(activeTimer.expiresAt).getTime() - Date.now()) / 1000));
        setTimeLeft(diff);
        if (diff === 0) {
           setActiveTimer(null);
           showAlert(t('safety_timer_expired_title'), t('safety_timer_expired_body'));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer, t]);

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

  // Scheduled fake call timer
  useEffect(() => {
    let interval: any;
    if (isFakeCallScheduled && scheduledSecondsLeft !== null && scheduledSecondsLeft > 0) {
      interval = setInterval(() => {
        setScheduledSecondsLeft(prev => {
          if (prev === null) return null;
          const next = prev - 1;

          // Vibrate 5 seconds before call to warn user discrretly in pocket
          if (next === 5) {
            if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
          }

          if (next <= 0) {
            clearInterval(interval);
            setIsFakeCallScheduled(false);
            triggerFakeCall();
            return null;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFakeCallScheduled, scheduledSecondsLeft]);

  useEffect(() => {
    return () => {
      stopRingtone();
      setIsFakeCallActive(false);
    };
  }, [setIsFakeCallActive]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const triggerFakeCall = () => {
    setIsFakeCallRinging(true);
    setIsFakeCallActive(true);
    startRingtone();
  };

  const acceptCall = () => {
    setIsFakeCallRinging(false);
    stopRingtone();
  };

  const endCall = () => {
    setIsFakeCallActive(false);
    setIsFakeCallRinging(false);
    setCallDuration(0);
    stopRingtone();
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
      if (editingIndex !== null) {
        // Update existing
        const newContacts = [...contacts];
        newContacts[editingIndex] = { name: manualName, number: manualNumber };
        setContacts(newContacts);
        setEditingIndex(null);
      } else {
        // Add new
        setContacts(prev => [...prev, { name: manualName, number: manualNumber }]);
      }
      setManualName('');
      setManualNumber('');
      setShowManualEntry(false);
    }
  };

  const startEditingContact = (index: number) => {
    const contact = contacts[index];
    setManualName(contact.name);
    setManualNumber(contact.number);
    setEditingIndex(index);
    setShowManualEntry(true);
  };

  const cancelManualEntry = () => {
    setManualName('');
    setManualNumber('');
    setEditingIndex(null);
    setShowManualEntry(false);
  };

  const removeContact = (index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setShowManualEntry(false);
    }
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
      showAlert(t('saved'), t('trusted_contacts_saved'));
    } catch (e: any) {
      showAlert(t('error'), e.message);
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
      showAlert(t('warning'), t('trusted_contact_required_sos'));
      return;
    }
    if (!window.confirm(t('sos_confirm'))) return;

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
      showAlert(t('sos_triggered_title'), t('sos_triggered_body'));
    } catch (e: any) {
      showAlert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleCheckIn = async () => {
    const totalMins = hours * 60 + minutes;
    if (totalMins <= 0) {
      showAlert(t('warning'), t('valid_duration_required'));
      return;
    }
    if (contacts.length === 0) {
      showAlert(t('warning'), t('trusted_contact_required'));
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
      const duration = `${hours > 0 ? hours + 'h' : ''}${minutes}min`;
      showAlert(t('sentinel_active_title'), t('sentinel_active_body', { duration }));
    } catch (e: any) {
      showAlert(t('error'), e.message);
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
      showAlert(t('safety_confirmed_title'), t('safety_confirmed_body'));
    } catch (e: any) {
      showAlert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pb-24 px-4 space-y-10 relative">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/apps')}
          className="p-3 bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-white/10 rounded-2xl text-slate-400 hover:text-primary transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-serif italic tracking-tighter text-slate-900 dark:text-white">{t('sentinel')}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-prestige text-[10px]">{t('security_discretion')}</p>
        </div>
      </div>

      {/* Check-in Card */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-slate-50 dark:border-white/5 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
              <Shield size={24} />
            </div>
            <h3 className="font-serif italic text-xl tracking-tighter text-slate-900 dark:text-white">{t('active_security')}</h3>
          </div>
          <button
            onClick={handleSOS}
            disabled={loading}
            className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 dark:shadow-none animate-pulse hover:scale-110 transition-all"
          >
            <AlertTriangle size={24} />
          </button>
        </div>

        {!activeTimer ? (
          <div className="space-y-6">
            {/* Duration Selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige ml-2">{t('watch_duration')}</label>
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-3xl">
                <div className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">{t('hours_label')}</span>
                  <input
                    type="number"
                    value={hours}
                    onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent text-center font-black text-2xl outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div className="text-slate-200 dark:text-white/10 font-black text-2xl">:</div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">{t('minutes_label')}</span>
                  <input
                    type="number"
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-full bg-transparent text-center font-black text-2xl outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Contacts Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige">{t('contacts_max_two')}</label>
                <div className="flex gap-4">
                   {isDirty && (
                     <button
                       onClick={saveContactsPermanently}
                       disabled={isSavingContacts}
                       className="text-[10px] font-black text-green-500 uppercase flex items-center gap-1 hover:underline disabled:opacity-50"
                     >
                        {isSavingContacts ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {t('save')}
                     </button>
                   )}
                   {contacts.length < 2 && (
                     <button
                       onClick={handlePickContact}
                       className="text-[10px] font-black text-primary uppercase flex items-center gap-1 hover:underline"
                     >
                        <Plus size={12} /> {t('add')}
                     </button>
                   )}
                </div>
              </div>

              {showManualEntry && (
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl space-y-3 animate-in slide-in-from-top-2">
                  <input
                    placeholder={t('contact_name_placeholder')}
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 rounded-xl px-4 py-2 text-sm font-bold outline-none text-slate-900 dark:text-white"
                  />
                  <input
                    placeholder={t('phone_number_placeholder')}
                    value={manualNumber}
                    onChange={(e) => setManualNumber(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 rounded-xl px-4 py-2 text-sm font-bold outline-none text-slate-900 dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button onClick={cancelManualEntry} className="flex-1 py-2 text-xs font-bold text-slate-400 dark:text-slate-500">{t('cancel')}</button>
                    <button onClick={addManualContact} className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-black">
                      {editingIndex !== null ? t('update') : t('add')}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {contacts.length === 0 ? (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center py-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl">
                    {t('no_contact_selected')}
                  </p>
                ) : (
                  contacts.map((c, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-3 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                          <User size={14} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black truncate text-slate-900 dark:text-white">{c.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500">{c.number}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEditingContact(i)} className="p-2 text-slate-300 dark:text-slate-700 hover:text-primary transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => removeContact(i)} className="p-2 text-slate-300 dark:text-slate-700 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Meeting Details Section */}
            <div className="space-y-4 pt-2">
              <label className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige ml-2">{t('meeting_details_optional')}</label>
              <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[2rem] space-y-4">
                <div className="space-y-1">
                   <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                      <MapPin size={10} /> {t('place')}
                   </div>
                   <input
                    placeholder={t('where_are_you')}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                   />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                      <User size={10} /> {t('person_name')}
                    </div>
                    <input
                      placeholder={t('met_person_placeholder')}
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                      <Phone size={10} /> {t('person_contact')}
                    </div>
                    <input
                      placeholder={t('phone_number_placeholder')}
                      value={personContact}
                      onChange={(e) => setPersonContact(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleScheduleCheckIn}
              disabled={loading || contacts.length === 0}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-medium text-xs uppercase tracking-prestige shadow-xl dark:shadow-none disabled:opacity-50 transition-all hover:scale-[1.02]"
            >
              {t('activate_protection')}
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
              <p className="text-blue-900 dark:text-blue-300 font-black text-[10px] uppercase tracking-widest mb-1">{t('protection_active')}</p>
              <p className="text-slate-400 dark:text-slate-500 text-[9px] font-bold uppercase">{t('auto_alert_at', { time: new Date(activeTimer.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}</p>
            </div>
            <button
              onClick={handleConfirmSafety}
              className="w-full bg-blue-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <CheckCircle size={18} /> {t('i_am_safe')}
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
          <h3 className="font-serif italic text-xl tracking-tighter">{t('fake_call')}</h3>
        </div>

        <div className="space-y-6 relative z-10">
          <div className="space-y-6">
            {/* Delay Selector */}
            <div className="space-y-3">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('when_ring')}</label>
              <div className="flex gap-2">
                {[0, 1, 2, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => setFakeCallDelay(val)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${
                      fakeCallDelay === val
                        ? 'bg-primary text-white shadow-lg'
                        : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {val === 0 ? t('immediate') : `${val} MIN`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('caller_label')}</label>
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
                  placeholder={t('caller_placeholder')}
                  className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-1 focus:ring-primary/50 outline-none text-white"
                />
              </div>
            </div>
          </div>

          {!isFakeCallScheduled ? (
            <button
              onClick={() => {
                if (fakeCallDelay === 0) {
                  triggerFakeCall();
                } else {
                  setScheduledSecondsLeft(fakeCallDelay * 60);
                  setIsFakeCallScheduled(true);
                }
              }}
              className="w-full bg-white text-slate-900 py-5 rounded-2xl font-medium text-xs uppercase tracking-prestige shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {fakeCallDelay === 0 ? t('start_simulation') : t('schedule_call')}
            </button>
          ) : (
            <div className="space-y-4">
               <div className="bg-primary/20 border border-primary/30 p-5 rounded-[2rem] text-center animate-in zoom-in duration-300">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse mb-1">{t('scheduled_call')}</p>
                  <p className="text-3xl font-black text-white">{formatDuration(scheduledSecondsLeft || 0)}</p>
               </div>
               <button
                onClick={() => { setIsFakeCallScheduled(false); setScheduledSecondsLeft(null); }}
                className="w-full py-4 border-2 border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
               >
                 {t('cancel_schedule')}
               </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-500/10 text-amber-600 dark:text-amber-500">
        <AlertTriangle size={20} className="flex-shrink-0" />
        <p className="text-[10px] font-bold uppercase tracking-tight leading-relaxed">
          {t('fake_call_sound_note_web')}
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
                {isFakeCallRinging ? t('incoming_call') : formatDuration(callDuration)}
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('decline')}</span>
                </button>
                <button
                  onClick={acceptCall}
                  className="flex flex-col items-center gap-3 group"
                >
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg group-active:scale-90 transition-transform">
                    <Phone size={28} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('accept')}</span>
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
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('hang_up')}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SentinelPage;
