import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, COLLECTIONS, fbStorage } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Camera, ShieldCheck, MapPin, Edit3, Save, LogOut,
  Sparkles, Plane, Globe, ChevronRight, Share2,
  EyeOff, Eye, Crown, Gem, Settings, User, Bell,
  CreditCard, HelpCircle
} from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';
import { apiRequest } from '@shared/lib/api';
import { useNavigate } from 'react-router-dom';
import PassportModal from '../components/PassportModal';
import { compressImageWeb } from '../lib/imageCompression';

const ProfilePage: React.FC = () => {
  const { user, profile, logout, t } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [isTogglingInvisible, setIsTogglingInvisible] = useState(false);

  // Éviter l'écran blanc si les données ne sont pas encore là
  if (loading && !profile) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Préparation de votre élégance...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="max-w-md mx-auto py-20 text-center px-6">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
            <User size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Profil non trouvé</h2>
          <p className="text-slate-500 font-medium mb-8">Veuillez vous connecter pour accéder à votre espace Galant.</p>
          <button
            onClick={() => navigate('/auth')}
            className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  const handleToggleInvisible = async () => {
    if (!profile.is_premium) {
      showAlert('Premium Requis', 'Le mode invisible est réservé aux membres Privilège (Trimestriel).');
      navigate('/premium');
      return;
    }

    setIsTogglingInvisible(true);
    try {
      const newValue = !profile.is_invisible;
      const userRef = doc(db, COLLECTIONS.PROFILES, user.uid);
      await updateDoc(userRef, { is_invisible: newValue });
      showAlert('Mode Invisible', newValue ? 'Votre profil est désormais masqué.' : 'Votre profil est de nouveau visible.');
    } catch (e: any) {
      showAlert('Erreur', e.message);
    } finally {
      setIsTogglingInvisible(false);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, COLLECTIONS.PROFILES, user.uid);
      await updateDoc(userRef, {
        name,
        bio,
        updated_at: new Date().toISOString()
      });
      setEditing(false);
      showAlert('Succès', 'Profil mis à jour avec élégance.');
    } catch (error: any) {
      showAlert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAiAssist = async () => {
    if (!profile?.is_premium) {
      showAlert('Premium Requis', t('ai_assistant_exclusive'));
      navigate('/premium');
      return;
    }

    setGenerating(true);
    try {
      const res = await apiRequest<{ suggestions: string[] }>('/api/ai/writing-assistant', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ type: 'BIO', context: { name: profile.name } })
      });
      if (res.suggestions?.[0]) {
        setBio(res.suggestions[0]);
      }
    } catch (error) {
      showAlert(t('ai_error'), t('ai_error_desc'));
    } finally {
      setGenerating(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressedBlob = await compressImageWeb(file);
      const storageRef = ref(fbStorage, `profiles/${user.uid}/${Date.now()}.webp`);
      await uploadBytes(storageRef, compressedBlob, { contentType: 'image/webp' });
      const url = await getDownloadURL(storageRef);

      const userRef = doc(db, COLLECTIONS.PROFILES, user.uid);
      const newPhotos = [url, ...(profile.photos || [])];
      await updateDoc(userRef, { photos: newPhotos });

      showAlert('Photo ajoutée', 'Votre nouvelle photo a été enregistrée.');
    } catch (error: any) {
      showAlert('Erreur Upload', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4">
      {/* Header Profile - Premium Style */}
      <div className="relative mb-12">
        <div className="h-64 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white">
          <img
            src={profile.photos?.[0] || 'https://placehold.co/1200x400?text=Ajouter+une+photo'}
            className="w-full h-full object-cover"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

          {/* Status Badge Over Image */}
          <div className="absolute top-6 left-6 flex gap-2">
            {profile.is_premium && (
              <div className="bg-gradient-to-r from-amber-400 to-amber-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                <Crown size={14} fill="currentColor" />
                Premium
              </div>
            )}
            {profile.is_verified && (
              <div className="bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                <ShieldCheck size={14} fill="currentColor" />
                Vérifié
              </div>
            )}
          </div>

          <label className="absolute bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-2xl shadow-xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all border-4 border-white/20 backdrop-blur-sm">
            {uploading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Camera size={24} />}
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
        </div>

        {/* Floating Name & Stats */}
        <div className="absolute -bottom-8 left-10 right-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white drop-shadow-lg">
            {editing ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-4xl font-black border-b-2 border-primary outline-none bg-transparent"
              />
            ) : (
              <h2 className="text-4xl font-black tracking-tight">{profile.name}, {profile.age}</h2>
            )}
            <div className="flex items-center gap-2 text-white/70 font-bold text-sm uppercase tracking-wider mt-1">
              <MapPin size={16} />
              <span>{profile.city || 'Ville non renseignée'}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl flex flex-col items-center min-w-[100px] border border-white/50">
              <span className="text-xl font-black text-primary">{profile.galanterie_score || '5.0'}</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Galanterie</span>
            </div>
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl flex flex-col items-center min-w-[100px] border border-white/50">
              <span className="text-xl font-black text-amber-600">{profile.roses_count || 0}</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Roses</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
        {/* Left Column: Info & Bio */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('my_bio')}</h3>
              <div className="flex gap-2">
                {editing && (
                  <button
                    onClick={handleAiAssist}
                    disabled={generating}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-secondary bg-purple-50 px-4 py-2 rounded-xl hover:bg-purple-100 transition-colors"
                  >
                    <Sparkles size={12} />
                    IA
                  </button>
                )}
                <button
                  onClick={() => editing ? handleUpdateProfile() : setEditing(true)}
                  disabled={loading}
                  className={`p-3 rounded-xl transition-all ${
                    editing ? 'bg-green-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:text-primary'
                  }`}
                >
                  {editing ? <Save size={18} /> : <Edit3 size={18} />}
                </button>
              </div>
            </div>

            {editing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                className="w-full p-6 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-primary/10 font-medium text-slate-700 leading-relaxed text-lg"
                placeholder="Décrivez votre élégance..."
              />
            ) : (
              <p className="text-slate-600 font-medium leading-relaxed text-lg italic">
                {profile.bio || "Aucune bio rédigée pour le moment. Cliquez sur l'icône éditer pour vous présenter."}
              </p>
            )}
          </div>

          {/* Invitation Card */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex items-center justify-between group hover:scale-[1.01] transition-all cursor-pointer shadow-2xl shadow-slate-900/20"
               onClick={() => {
                 const url = `https://galant.app/invite/${user.uid}`;
                 navigator.clipboard.writeText(url);
                 showAlert('Lien copié !', 'Partagez ce lien avec vos amis. Une Rose d\'Or vous sera offerte pour chaque inscription certifiée.');
               }}>
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-primary group-hover:rotate-12 transition-transform">
                <Share2 size={32} />
              </div>
              <div className="text-left">
                <p className="text-lg font-black italic uppercase tracking-tighter leading-none mb-1">Inviter un Ami 🌹</p>
                <p className="text-sm font-bold text-slate-400">Gagnez des Roses d'Or gratuitement</p>
              </div>
            </div>
            <div className="bg-white/10 p-3 rounded-full group-hover:bg-primary transition-colors">
              <ChevronRight size={24} />
            </div>
          </div>
        </div>

        {/* Right Column: Menu & Actions */}
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-2">

            {/* Action Item: Passport */}
            <button
              onClick={() => setIsPassportOpen(true)}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <Plane size={24} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Mode Voyage</p>
                <p className="text-[10px] font-bold text-slate-400">
                  {profile.passport_city ? profile.passport_city : 'Changez de ville'}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-200" />
            </button>

            {/* Action Item: Invisible */}
            <button
              onClick={handleToggleInvisible}
              disabled={isTogglingInvisible}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-all text-left group ${
                profile.is_invisible ? 'bg-teal-50/50' : 'hover:bg-slate-50'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                profile.is_invisible ? 'bg-teal-500 text-white shadow-lg shadow-teal-100' : 'bg-slate-50 text-slate-300 group-hover:bg-slate-100'
              }`}>
                {profile.is_invisible ? <EyeOff size={24} /> : <Eye size={24} />}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-black uppercase tracking-tight ${profile.is_invisible ? 'text-teal-900' : 'text-slate-900'}`}>
                  Mode Invisible
                </p>
                <p className="text-[10px] font-bold text-slate-400">
                  {profile.is_invisible ? 'Actuellement masqué' : 'Devenir discret'}
                </p>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${profile.is_invisible ? 'bg-teal-500' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${profile.is_invisible ? 'left-6' : 'left-1'}`}></div>
              </div>
            </button>

            <div className="h-[1px] bg-slate-50 mx-4 my-2"></div>

            {/* General Menu Items */}
            <button className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all text-left group">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                <Bell size={20} />
              </div>
              <p className="flex-1 text-sm font-black text-slate-700 uppercase tracking-tight">Notifications</p>
            </button>

            <button onClick={() => navigate('/premium')} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all text-left group">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <CreditCard size={20} />
              </div>
              <p className="flex-1 text-sm font-black text-slate-700 uppercase tracking-tight">Abonnement</p>
            </button>

            <button className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all text-left group">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                <HelpCircle size={20} />
              </div>
              <p className="flex-1 text-sm font-black text-slate-700 uppercase tracking-tight">Aide</p>
            </button>
          </div>

          <button
            onClick={() => logout()}
            className="w-full py-5 rounded-[2rem] border-2 border-slate-100 text-slate-300 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-rose-50 hover:text-primary hover:border-primary/10 transition-all group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            {t('logout')}
          </button>
        </div>
      </div>

      <PassportModal
        isOpen={isPassportOpen}
        onClose={() => setIsPassportOpen(false)}
      />
    </div>
  );
};

export default ProfilePage;
