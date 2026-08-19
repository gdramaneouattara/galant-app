import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';
import { ChevronLeft, Calendar, Image as ImageIcon, AlignLeft, Tag, Clock, Camera } from 'lucide-react';
import { uploadImageVariantsWeb } from '../lib/imageUploadVariants';
import OptimizedImage from '../components/OptimizedImage';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';

const EVENT_TYPES = [
  { value: 'PARTY', label: 'Soirée' },
  { value: 'FLASH_OFFER', label: 'Offre Flash' },
  { value: 'NETWORKING', label: 'Networking' },
  { value: 'LIVE_MUSIC', label: 'Concert / Live' },
];

const CreateEventPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    photoUrl: '',
    photoVariants: {} as Record<string, { full: string; medium: string; thumb: string }>,
    eventType: 'PARTY',
    startsAt: '',
    expiresAt: ''
  });

  if (!profile?.is_partner) {
    return <div className="text-center py-20 font-bold text-slate-400 text-xl ">Accès réservé aux partenaires.</div>;
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const { fullUrl, variants } = await uploadImageVariantsWeb(file, `events/${user.uid}/${Date.now()}.webp`);
      setForm(prev => ({ ...prev, photoUrl: fullUrl, photoVariants: { [fullUrl]: variants } }));
      showAlert('Succès', 'Image de l\'événement chargée.');
    } catch (error: any) {
      showAlert('Erreur', 'Échec du chargement de l\'image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.title || !form.description || !form.startsAt || !form.expiresAt) {
      showAlert('Champs requis', 'Veuillez remplir toutes les informations obligatoires.');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/api/venues/partner/events', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          ...form,
          startsAt: new Date(form.startsAt).toISOString(),
          expiresAt: new Date(form.expiresAt).toISOString()
        })
      });

      showAlert('Succès', 'Votre événement a été publié sur l\'Agenda Galant.');
      navigate('/partner');
    } catch (error: any) {
      showAlert('Erreur', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20 space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/partner')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-black ">Créer un événement</h2>
          <p className="text-slate-500 font-medium">Publiez une offre ou une soirée exclusive</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl dark:shadow-none border border-slate-100 dark:border-white/10 p-8 space-y-6 transition-colors">
        {/* Photo de l'événement */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Image de couverture</h3>
          <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-50 dark:border-white/5 transition-colors">
            {form.photoUrl ? (
              <OptimizedImage src={optimizedPhotoUrl(form.photoUrl, form.photoVariants, 'medium')} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2 transition-colors">
                <ImageIcon size={40} strokeWidth={1} />
                <span className="text-xs font-bold">Format 16:9 recommandé</span>
              </div>
            )}
            <label className="absolute bottom-4 right-4 bg-white dark:bg-slate-700 p-3 rounded-2xl shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-all text-primary">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
            </label>
            {uploading && (
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Titre */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 transition-colors">
            <Tag size={16} className="text-primary" />
            Titre de l'événement
          </label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Ex: Soirée Blanche, Offre Spéciale Dîner..."
            className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium text-slate-900 dark:text-white"
          />
        </div>

        {/* Type d'événement */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 transition-colors">
            <Calendar size={16} className="text-primary" />
            Type
          </label>
          <div className="flex gap-2 flex-wrap">
            {EVENT_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, eventType: t.value }))}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${form.eventType === t.value ? 'bg-primary text-white shadow-lg dark:shadow-none' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 transition-colors">
            <AlignLeft size={16} className="text-primary" />
            Description / Détails
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            rows={4}
            placeholder="Présentez les détails de votre offre ou programme..."
            className="w-full p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary/10 font-medium text-slate-700 dark:text-slate-300 transition-colors"
          />
        </div>

        {/* Horaires */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 transition-colors">
              <Clock size={16} className="text-primary" />
              Début
            </label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={e => setForm(prev => ({ ...prev, startsAt: e.target.value }))}
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium text-slate-900 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 transition-colors">
              <Clock size={16} className="text-slate-400 dark:text-slate-500" />
              Fin / Expiration
            </label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={e => setForm(prev => ({ ...prev, expiresAt: e.target.value }))}
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-6 rounded-3xl font-black text-lg shadow-xl dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
        >
          {submitting ? 'Publication en cours...' : 'PUBLIER L\'ÉVÉNEMENT'}
        </button>
      </form>
    </div>
  );
};

export default CreateEventPage;
