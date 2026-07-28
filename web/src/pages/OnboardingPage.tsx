import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, COLLECTIONS, fbStorage } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  User as UserIcon, MapPin, Heart, Sparkles, Image as ImageIcon,
  CheckCircle2, ChevronRight, ChevronLeft, Loader2,
  Rocket, Gem, ShieldCheck, Lock, Camera
} from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';
import { apiRequest } from '@shared/lib/api';

const INTERESTS_OPTIONS = [
  'Voyage', 'Gastronomie', 'Vin', 'Art', 'Mode', 'Fitness',
  'Business', 'Musique', 'Cinéma', 'Lecture', 'Développement personnel',
  'Sorties chic', 'Automobile', 'Architecture', 'Cigare', 'Opéra', 'Golf'
];

const RELATIONSHIP_GOALS = [
  { id: 'SERIOUS', label: 'Relation sérieuse', icon: '💍', desc: 'Pour construire un avenir durable.' },
  { id: 'MARRIAGE', label: 'Mariage / Vie commune', icon: '💎', desc: 'L\'engagement ultime de l\'élégance.' },
  { id: 'FRIENDSHIP', label: 'Amitié sélective', icon: '🥂', desc: 'Des rencontres de haut vol, sans pression.' },
  { id: 'NETWORKING', label: 'Réseautage prestige', icon: '🤝', desc: 'Élargir son cercle d\'influence.' }
];

const BIO_PROMPTS = [
  "Mon idée d'un premier rendez-vous parfait...",
  "Ce qui me fait rire aux éclats...",
  "Le trait de caractère que j'admire le plus...",
  "Une passion qui me fait perdre la notion du temps..."
];

const OnboardingPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setForm] = useState({
    name: '',
    age: '',
    gender: 'MALE',
    relationship_goal: 'SERIOUS',
    bio: '',
    interests: [] as string[],
    city: '',
    country: 'Cameroun',
    latitude: null as number | null,
    longitude: null as number | null,
    photos: [] as string[]
  });

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calcul du Score de Rayonnement (0-100%)
  const calculateRadiance = () => {
    let score = 0;
    if (formData.name && formData.age) score += 20;
    if (formData.relationship_goal && formData.interests.length >= 3) score += 30;
    if (formData.city && formData.bio.length >= 15) score += 25;
    if (photoFiles.length >= 1) score += 25;
    return score;
  };

  useEffect(() => {
    if (profile && profile.onboarding_completed) {
      navigate('/');
    }
  }, [profile, navigate]);

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => Math.max(1, prev - 1));

  const toggleInterest = (interest: string) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const addPromptToBio = (prompt: string) => {
    setForm(prev => ({
      ...prev,
      bio: prev.bio ? `${prev.bio}\n\n${prompt}` : prompt
    }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photoFiles.length > 6) {
      showAlert('Limite atteinte', 'Vous pouvez ajouter jusqu\'à 6 photos.');
      return;
    }
    setPhotoFiles(prev => [...prev, ...files]);
  };

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGeoLocation = () => {
    if (!navigator.geolocation) {
      showAlert('Erreur', 'La géolocalisation n\'est pas supportée.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || '';
          setForm(prev => ({ ...prev, latitude, longitude, city, country: data.address.country || 'Cameroun' }));
          showAlert('Succès', `Position détectée : ${city}`);
        } catch (e) {
          setForm(prev => ({ ...prev, latitude, longitude, city: 'Douala' }));
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        showAlert('Oups', 'Impossible de vous localiser automatiquement.');
      }
    );
  };

  const handleFinalSubmit = async () => {
    if (!user) return;
    if (photoFiles.length === 0) {
      showAlert('Photo requise', 'Veuillez ajouter au moins une photo pour continuer.');
      return;
    }

    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of photoFiles) {
        const storageRef = ref(fbStorage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        uploadedUrls.push(url);
      }

      const token = await user.getIdToken();

      // Complete onboarding via the server so profile defaults and moderation hooks stay centralized.
      await apiRequest('/api/profiles/complete-onboarding', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: formData.name,
          age: formData.age,
          gender: formData.gender,
          relationship_goal: formData.relationship_goal,
          interests: formData.interests,
          bio: formData.bio,
          city: formData.city,
          country: formData.country,
          latitude: formData.latitude,
          longitude: formData.longitude,
          photos: uploadedUrls,
          radiance_score: calculateRadiance()
        })
      });

      showAlert('Dossier Transmis 🌹', 'Bienvenue dans le Cercle Galant. Votre profil est en cours de revue par notre Conciergerie pour garantir l\'excellence de notre communauté.');

      // On recharge la page pour forcer le rafraîchissement complet du profil dans l'AuthContext
      window.location.href = '/';
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Échec de la création du profil.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: // Identity
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center space-y-2">
               <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mx-auto text-primary mb-4">
                  <UserIcon size={32} />
               </div>
               <h3 className="text-3xl font-black italic tracking-tighter dark:text-white">Qui êtes-vous ?</h3>
               <p className="text-slate-500 dark:text-slate-400 font-medium">L'élégance commence par la transparence.</p>
            </div>

            <div className="space-y-5">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nom et prénom(s)</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    placeholder="Votre nom complet"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Âge</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={e => setForm(prev => ({ ...prev, age: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    placeholder="25"
                    min="18"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Genre</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['MALE', 'FEMALE'].map(g => (
                      <button
                        key={g}
                        onClick={() => setForm(prev => ({ ...prev, gender: g }))}
                        className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                          formData.gender === g ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {g === 'MALE' ? 'Homme' : 'Femme'}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            <button
              onClick={nextStep}
              disabled={!formData.name || !formData.age || parseInt(formData.age) < 18}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all disabled:opacity-30 mt-8"
            >
              Suivant <ChevronRight size={16} />
            </button>
          </div>
        );

      case 2: // Goal & Interests
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="text-center space-y-2">
               <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mx-auto text-amber-500 mb-4">
                  <Heart size={32} />
               </div>
               <h3 className="text-3xl font-black italic tracking-tighter dark:text-white">Vos Intentions</h3>
               <p className="text-slate-500 dark:text-slate-400 font-medium">Pour des rencontres qui vous ressemblent.</p>
            </div>

            <div className="space-y-6">
               <div className="grid grid-cols-1 gap-3">
                  {RELATIONSHIP_GOALS.map(goal => (
                    <button
                      key={goal.id}
                      onClick={() => setForm(prev => ({ ...prev, relationship_goal: goal.id }))}
                      className={`p-5 rounded-3xl text-left transition-all border-2 flex items-center gap-5 ${
                        formData.relationship_goal === goal.id ? 'bg-white dark:bg-slate-800 border-primary shadow-xl shadow-red-500/5' : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      <span className="text-3xl">{goal.icon}</span>
                      <div className="flex-1">
                        <p className={`font-black text-sm uppercase tracking-tight ${formData.relationship_goal === goal.id ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>{goal.label}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1">{goal.desc}</p>
                      </div>
                      {formData.relationship_goal === goal.id && <CheckCircle2 className="text-primary" size={20} />}
                    </button>
                  ))}
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Centres d'intérêt (choisissez-en 3 ou plus)</label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS_OPTIONS.map(interest => (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-[11px] transition-all border ${
                          formData.interests.includes(interest)
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                          : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={prevStep} className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextStep}
                disabled={formData.interests.length < 3}
                className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black dark:hover:bg-slate-200 transition-all disabled:opacity-30"
              >
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          </div>
        );

      case 3: // Location & Bio
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="text-center space-y-2">
               <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto text-blue-500 mb-4">
                  <MapPin size={32} />
               </div>
               <h3 className="text-3xl font-black italic tracking-tighter dark:text-white">Emplacement & Bio</h3>
               <p className="text-slate-500 dark:text-slate-400 font-medium">Où la magie doit-elle opérer ?</p>
            </div>

            <div className="space-y-6">
               <div className="space-y-4">
                  <button
                    onClick={handleGeoLocation}
                    disabled={loading}
                    className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                      formData.latitude
                        ? 'bg-green-500 text-white shadow-lg shadow-green-100 dark:shadow-none'
                        : 'bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none'
                    }`}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                    {formData.latitude ? `Position détectée : ${formData.city} ✓` : 'Détecter ma position GPS'}
                  </button>
                  {!formData.latitude && (
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center italic">
                      L'autorisation GPS est requise pour continuer.
                    </p>
                  )}
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Une accroche élégante (Bio)</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                     {BIO_PROMPTS.map(p => (
                       <button
                         key={p}
                         onClick={() => addPromptToBio(p)}
                         className="text-[9px] font-bold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 px-3 py-1.5 rounded-full hover:border-primary hover:text-primary dark:hover:text-primary transition-all"
                       >
                         + {p}
                       </button>
                     ))}
                  </div>
                  <textarea
                    value={formData.bio}
                    onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-3xl px-6 py-4 font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20 min-h-[140px] resize-none transition-colors"
                    placeholder="Parlez-nous de ce qui vous rend unique..."
                  />
               </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={prevStep} className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextStep}
                disabled={!formData.latitude || !formData.city || formData.bio.length < 15}
                className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black dark:hover:bg-slate-200 transition-all disabled:opacity-30"
              >
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          </div>
        );

      case 4: // Photos
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="text-center space-y-2">
               <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-4">
                  <Camera size={32} />
               </div>
               <h3 className="text-3xl font-black italic tracking-tighter dark:text-white">Votre Galerie</h3>
               <p className="text-slate-500 dark:text-slate-400 font-medium">L'élégance en image (1 photo minimum).</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
               {photoFiles.map((file, idx) => (
                 <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border border-slate-100 dark:border-white/5">
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                 </div>
               ))}
               {photoFiles.length < 6 && (
                 <button
                   onClick={() => fileInputRef.current?.click()}
                   className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                 >
                   <ImageIcon size={24} />
                   <span className="text-[8px] font-black uppercase mt-2">Ajouter</span>
                 </button>
               )}
            </div>

            <div className="bg-slate-950 dark:bg-black p-6 rounded-[2rem] space-y-4 border border-transparent dark:border-white/5">
               <div className="flex items-center gap-3 text-white">
                  <ShieldCheck className="text-green-400" size={20} />
                  <p className="text-xs font-black uppercase tracking-widest">Guide de Style</p>
               </div>
               <ul className="space-y-2">
                  {[
                    "Privilégiez la lumière naturelle du jour.",
                    "Évitez les lunettes de soleil (vos yeux brillent !).",
                    "Montrez votre style de vie et vos passions.",
                    "Un profil complet augmente votre visibilité auprès des membres"
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-tight">
                       <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                       {tip}
                    </li>
                  ))}
               </ul>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="image/*"
              onChange={handlePhotoSelect}
            />

            <div className="flex gap-4 pt-4">
              <button onClick={prevStep} disabled={loading} className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextStep}
                disabled={loading || photoFiles.length === 0}
                className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black dark:hover:bg-slate-200 transition-all disabled:opacity-30"
              >
                Signer le Manifeste <ChevronRight size={16} />
              </button>
            </div>
          </div>
        );

      case 5: // Manifesto
        return (
          <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700 py-4">
            <div className="text-center space-y-3">
               <h3 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white transition-colors">Le Manifeste</h3>
               <p className="text-amber-600 font-black text-[10px] uppercase tracking-[0.3em]">Contrat de Prestige</p>
            </div>

            <div className="space-y-8">
               {[
                 {
                   title: "Discrétion Absolue",
                   desc: "Ce qui se passe dans le Cercle reste dans le Cercle. La vie privée de nos membres est sacrée.",
                   icon: Lock
                 },
                 {
                   title: "Respect & Courtoisie",
                   desc: "La galanterie n'est pas une option, c'est notre langage commun. Chaque échange doit être empreint d'élégance.",
                   icon: Heart
                 },
                 {
                   title: "Authenticité",
                   desc: "Votre vérité fait votre rayonnement. Seuls les profils sincères et vérifiés font la force de Galant.",
                   icon: ShieldCheck
                 }
               ].map((item, i) => (
                 <div key={i} className="flex gap-5 items-start group">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-600 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/20 group-hover:text-amber-600 transition-colors shrink-0">
                       <item.icon size={24} />
                    </div>
                    <div className="space-y-1">
                       <h4 className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white transition-colors">{item.title}</h4>
                       <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed transition-colors">{item.desc}</p>
                    </div>
                 </div>
               ))}
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100/50 dark:border-amber-900/20">
               <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed text-center">
                  En rejoignant Galant, vous vous engagez à porter haut les valeurs de distinction et de bienveillance qui animent notre communauté.
               </p>
            </div>

            <div className="flex gap-4">
               <button onClick={prevStep} disabled={loading} className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  <ChevronLeft size={20} />
               </button>
               <button
                 onClick={handleFinalSubmit}
                 disabled={loading}
                 className="flex-1 bg-primary text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-red-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
               >
                 {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={16} fill="currentColor" />}
                 J'ADHÈRE AUX VALEURS
               </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const radiance = calculateRadiance();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl overflow-hidden border border-transparent dark:border-white/5 transition-colors">
        {/* Progress & Radiance */}
        <div className="bg-slate-900 px-10 py-3 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <Sparkles className="text-amber-400" size={14} />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Rayonnement</span>
           </div>
           <div className="flex items-center gap-3">
              <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                 <div
                   className="h-full bg-gradient-to-r from-amber-600 to-amber-300 transition-all duration-1000 ease-out"
                   style={{ width: `${radiance}%` }}
                 />
              </div>
              <span className="text-[10px] font-black text-amber-400">{radiance}%</span>
           </div>
        </div>

        <div className="p-10">
          {renderStep()}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
         <Gem className="text-slate-300 dark:text-slate-700" size={16} />
         <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">Dossier d'adhésion confidentiel</p>
      </div>
    </div>
  );
};

export default OnboardingPage;
