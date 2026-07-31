import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, COLLECTIONS, fbStorage } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { ShieldCheck, Camera, FileText, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';
import { Link, useNavigate } from 'react-router-dom';

const DOCUMENT_TYPES = [
  { value: 'ID_CARD', label: 'Carte nationale' },
  { value: 'PASSPORT', label: 'Passeport' },
  { value: 'DRIVERS_LICENSE', label: 'Permis de conduire' },
];

import { compressImageWeb } from '../lib/imageCompression';

const VerifyPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [documentType, setDocumentType] = useState('ID_CARD');
  const [files, setFiles] = useState<{ front: File | null; back: File | null; selfie: File | null }>({
    front: null,
    back: null,
    selfie: null
  });
  const [kycStatus, setKycStatus] = useState<any>(null);

  // ... (useEffect remains the same)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'selfie') => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles(prev => ({ ...prev, [type]: file }));
    }
  };

  const uploadToStorage = async (file: File, path: string) => {
    // Compression avant upload
    const compressedBlob = await compressImageWeb(file);
    const storageRef = ref(fbStorage, path.replace(/\.[^.]+$/, '.webp')); // Forcer extension .webp
    await uploadBytes(storageRef, compressedBlob, { contentType: 'image/webp' });
    return path.replace(/\.[^.]+$/, '.webp');
  };

  const handleSubmit = async () => {
    if (!user || submitting) return;
    if (!files.front || !files.selfie) {
      showAlert('Champs manquants', 'Veuillez uploader le recto de votre pièce et un selfie.');
      return;
    }

    setSubmitting(true);
    try {
      const folder = `kyc-docs/${user.uid}/${Date.now()}`;
      const frontPath = await uploadToStorage(files.front, `${folder}/front.jpg`);
      const selfiePath = await uploadToStorage(files.selfie, `${folder}/selfie.jpg`);
      let backPath = null;
      if (files.back) {
        backPath = await uploadToStorage(files.back, `${folder}/back.jpg`);
      }

      await apiRequest('/api/kyc/requests', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          document_type: documentType,
          document_front_path: frontPath,
          document_back_path: backPath,
          selfie_path: selfiePath,
          selfie_capture_mode: 'WEB_UPLOAD',
          selfie_captured_at: new Date().toISOString()
        })
      });

      showAlert('Succès', 'Votre dossier a été envoyé pour vérification.');
      navigate('/profile');
    } catch (error: any) {
      showAlert('Erreur', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20 animate-pulse"><div className="h-12 w-12 bg-slate-200 dark:bg-slate-800 rounded-full"></div></div>;

  if (profile?.is_verified) {
    return (
      <div className="max-w-md mx-auto text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl dark:shadow-none border border-slate-100 dark:border-white/10 p-10 transition-colors">
        <div className="w-24 h-24 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 transition-colors">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-black mb-4 text-slate-900 dark:text-white">Profil Vérifié</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium transition-colors">Votre identité a été confirmée avec succès. Vous rayonnez désormais sur Galant.</p>
        <Link to="/profile" className="block w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-bold transition-all hover:bg-black dark:hover:bg-slate-100">
          Retour au profil
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/profile')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400 dark:text-slate-500">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Vérification KYC</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Garantir la sécurité de la communauté</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl dark:shadow-none border border-slate-100 dark:border-white/5 p-8 space-y-8 transition-colors">
        {/* Statut actuel */}
        {kycStatus?.current && (
           <div className={`p-4 rounded-2xl flex items-center gap-4 ${kycStatus.current.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'} transition-colors`}>
             <AlertCircle size={20} />
             <div className="flex-1 text-sm font-bold">
               Statut : {kycStatus.current.status}
               {kycStatus.current.rejection_reason && <p className="text-xs font-medium mt-1">{kycStatus.current.rejection_reason}</p>}
             </div>
           </div>
        )}

        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">1. Type de document</h3>
          <div className="flex gap-2 flex-wrap">
            {DOCUMENT_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setDocumentType(t.value)}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${documentType === t.value ? 'bg-primary text-white shadow-lg shadow-red-100 dark:shadow-none' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">2. Photos du document</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`flex flex-col items-center justify-center gap-3 p-8 rounded-3xl border-2 border-dashed cursor-pointer transition-all ${files.front ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:border-primary/30 transition-colors'}`}>
              <FileText size={32} />
              <span className="text-xs font-black uppercase tracking-tighter text-center">
                {files.front ? 'Recto chargé' : 'Recto (obligatoire)'}
              </span>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} />
            </label>

            <label className={`flex flex-col items-center justify-center gap-3 p-8 rounded-3xl border-2 border-dashed cursor-pointer transition-all ${files.back ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:border-primary/30 transition-colors'}`}>
              <FileText size={32} />
              <span className="text-xs font-black uppercase tracking-tighter text-center">
                {files.back ? 'Verso chargé' : 'Verso (facultatif)'}
              </span>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} />
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">3. Selfie de vérification</h3>
          <label className={`flex flex-col items-center justify-center gap-3 p-10 rounded-3xl border-2 border-dashed cursor-pointer transition-all ${files.selfie ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:border-primary/30 transition-colors'}`}>
            <Camera size={32} />
            <span className="text-xs font-black uppercase tracking-tighter text-center">
              {files.selfie ? 'Selfie chargé' : 'Capturer ou charger un selfie'}
            </span>
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'selfie')} />
          </label>
        </section>

        <button
          onClick={handleSubmit}
          disabled={submitting || !files.front || !files.selfie}
          className="w-full bg-primary text-white py-6 rounded-3xl font-black text-lg shadow-xl shadow-red-100 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
        >
          {submitting ? 'Envoi en cours...' : 'Soumettre mon dossier'}
        </button>
      </div>
    </div>
  );
};

export default VerifyPage;
