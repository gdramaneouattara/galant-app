import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, COLLECTIONS, fbStorage } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, ShieldCheck, MapPin, Edit3, Save, LogOut, Sparkles, Plane, Globe, ChevronRight, Share2, EyeOff, Eye } from 'lucide-react';
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

  if (!user || !profile) return null;

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
      // Compression Web
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
    <div className="max-w-2xl mx-auto pb-20">
      <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
        {/* En-tête avec Photo et Bouton Edit */}
        <div className="relative h-64 bg-slate-100">
          <img
            src={profile.photos?.[0] || 'https://placehold.co/600x400?text=Ajouter+une+photo'}
            className="w-full h-full object-cover"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

          <label className="absolute bottom-6 right-6 w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center text-primary cursor-pointer hover:scale-110 active:scale-95 transition-all">
            <Camera size={24} />
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
        </div>

        <div className="p-8 -mt-12 relative bg-white rounded-t-[3rem]">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {editing ? (
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-3xl font-black text-slate-900 border-b-2 border-primary outline-none bg-transparent"
                  />
                ) : (
                  <h2 className="text-3xl font-black text-slate-900">{profile.name}, {profile.age}</h2>
                )}
                {profile.is_verified && <ShieldCheck size={24} className="text-blue-500 fill-blue-50" />}
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-bold text-sm uppercase tracking-wider">
                <MapPin size={16} />
                <span>{profile.city || 'Ville non renseignée'}</span>
              </div>
            </div>

            <button
              onClick={() => editing ? handleUpdateProfile() : setEditing(true)}
              disabled={loading}
              className={`p-4 rounded-2xl shadow-lg transition-all ${
                editing ? 'bg-green-500 text-white shadow-green-100' : 'bg-slate-50 text-slate-400'
              }`}
            >
              {editing ? <Save size={20} /> : <Edit3 size={20} />}
            </button>
          </div>

          {/* Section Bio */}
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('my_bio')}</h3>
              {editing && (
                <button
                  onClick={handleAiAssist}
                  disabled={generating}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-secondary bg-purple-50 px-4 py-2 rounded-full hover:bg-purple-100 transition-colors"
                >
                  {generating ? <div className="w-3 h-3 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></div> : <Sparkles size={12} />}
                  Aide IA
                </button>
              )}
            </div>
            {editing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full p-6 rounded-[2rem] bg-slate-50 border-none outline-none focus:ring-2 focus:ring-primary/10 font-medium text-slate-700 leading-relaxed"
                placeholder="Décrivez votre élégance..."
              />
            ) : (
              <p className="text-slate-600 font-medium leading-relaxed bg-slate-50/50 p-6 rounded-[2rem]">
                {profile.bio || "Aucune bio rédigée pour le moment. Cliquez sur éditer pour vous présenter."}
              </p>
            )}
          </div>

          {/* Statistiques Galanterie */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-rose-50 p-6 rounded-[2rem] text-center border border-rose-100">
              <span className="block text-2xl font-black text-primary">{profile.galanterie_score || '5.0'}</span>
              <span className="text-[10px] font-black text-rose-300 uppercase tracking-tighter">Score Galanterie</span>
            </div>
            <div className="bg-amber-50 p-6 rounded-[2rem] text-center border border-amber-100">
              <span className="block text-2xl font-black text-amber-600">{profile.roses_count || 0}</span>
              <span className="text-[10px] font-black text-amber-300 uppercase tracking-tighter">Roses Reçues</span>
            </div>
          </div>

          {/* Invitation / Parrainage */}
          <div className="mb-6 bg-slate-900 p-6 rounded-[2rem] text-white flex items-center justify-between group hover:scale-[1.02] transition-all cursor-pointer shadow-xl"
               onClick={() => {
                 const url = `https://galant.app/invite/${user.uid}`;
                 navigator.clipboard.writeText(url);
                 showAlert('Lien copié !', 'Partagez ce lien avec vos amis. Une Rose d\'Or vous sera offerte pour chaque inscription certifiée.');
               }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary">
                <Share2 size={24} />
              </div>
              <div className="text-left">
                <p className="text-sm font-black italic uppercase tracking-tighter leading-none">Inviter un Ami 🌹</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Gagnez des Roses d'Or gratuitement</p>
              </div>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-white transition-colors" size={20} />
          </div>

          {/* Mode Voyage (Passport) */}
          <div className="space-y-4 mb-10">
            <button
              onClick={() => setIsPassportOpen(true)}
              className="w-full p-6 rounded-[2rem] bg-slate-900 text-white flex items-center justify-between group hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-amber-400">
                  <Plane size={24} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black italic uppercase tracking-tighter leading-none">Mode Voyage 💎</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">
                    {profile.passport_city ? `Actif : ${profile.passport_city}` : 'Changez de ville virtuellement'}
                  </p>
                </div>
              </div>
              <ChevronRight className="text-slate-500 group-hover:text-white transition-colors" size={20} />
            </button>

            {/* Mode Invisible */}
            <button
              onClick={handleToggleInvisible}
              disabled={isTogglingInvisible}
              className={`w-full p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between group active:scale-95 ${
                profile.is_invisible
                  ? 'bg-teal-50 border-teal-100'
                  : 'bg-white border-slate-100 hover:border-teal-100 hover:bg-teal-50/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  profile.is_invisible ? 'bg-teal-500 text-white shadow-lg shadow-teal-100' : 'bg-slate-50 text-slate-400'
                }`}>
                  {profile.is_invisible ? <EyeOff size={24} /> : <Eye size={24} />}
                </div>
                <div className="text-left">
                  <p className={`text-sm font-black italic uppercase tracking-tighter leading-none ${profile.is_invisible ? 'text-teal-900' : 'text-slate-900'}`}>Mode Invisible 🎭</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">
                    {profile.is_invisible ? 'Vous êtes actuellement masqué' : 'Disponible avec le plan Privilège'}
                  </p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-colors ${profile.is_invisible ? 'bg-teal-500' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${profile.is_invisible ? 'left-7' : 'left-1'}`}></div>
              </div>
            </button>
          </div>

          {/* Actions du compte */}
          <div className="space-y-3">
            <button
              onClick={() => logout()}
              className="w-full py-5 rounded-2xl border-2 border-slate-100 text-slate-400 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 hover:text-red-500 transition-all"
            >
              <LogOut size={18} />
              {t('logout')}
            </button>
          </div>
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
