import React, { useState } from 'react';
import {
  Send,
  Users,
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
  History as HistoryIcon,
  Info,
  Star,
  Heart
} from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';

const AdminMessaging: React.FC = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'PREMIUM' | 'MALE' | 'FEMALE'>('ALL');
  const [sending, setSending] = useState(false);

  const handleSendBroadcast = async () => {
    if (!title || !body) {
      showAlert('Champs requis', 'Veuillez saisir un titre et un message.');
      return;
    }

    if (!window.confirm(`Voulez-vous vraiment envoyer ce message à l'audience : ${targetAudience} ?`)) return;

    setSending(true);
    try {
      await apiRequest('/api/admin/broadcast', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ title, body, targetAudience })
      });
      showAlert('Succès', 'Message envoyé avec succès à toute l\'audience ciblée.');
      setTitle('');
      setBody('');
    } catch (e: any) {
      showAlert('Erreur', e.message || 'Échec de l\'envoi du broadcast.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h2 className="text-3xl font-sans  tracking-tighter text-slate-900 dark:text-white sm:text-4xl">Messages Admin</h2>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 sm:text-lg">Diffusez des annonces à toute la communauté Galant.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulaire d'envoi */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-slate-100 dark:border-white/5 space-y-8">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-prestige ml-2">Cible du message</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                {[
                  { id: 'ALL', label: 'Tous', icon: Users },
                  { id: 'PREMIUM', label: 'Premium', icon: Gem },
                  { id: 'MALE', label: 'Hommes', icon: UserIcon },
                  { id: 'FEMALE', label: 'Femmes', icon: HeartIcon }
                ].map((aud: any) => (
                  <button
                    key={aud.id}
                    onClick={() => setTargetAudience(aud.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                      targetAudience === aud.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-100 dark:border-white/5 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    {/* Note: Icon usage placeholder as we use shared names */}
                    <span className="text-[10px] font-black uppercase tracking-widest">{aud.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-prestige ml-2">Titre de la notification</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Soirée exclusive ce soir !"
                className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-prestige ml-2">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Décrivez l'annonce en quelques lignes..."
                className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-[2rem] px-6 py-4 font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleSendBroadcast}
            disabled={sending || !title || !body}
            className="w-full bg-primary text-white py-6 rounded-3xl font-black text-xs uppercase tracking-prestige flex items-center justify-center gap-3 shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
          >
            {sending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
            Diffuser le message
          </button>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
           <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-6 shadow-2xl relative overflow-hidden">
             <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl"></div>
             <div className="flex items-center gap-3">
               <Info className="text-primary" size={20} />
               <h3 className="text-xs font-black uppercase tracking-widest text-primary">Règles d'envoi</h3>
             </div>
             <ul className="space-y-4 text-xs font-medium text-slate-400 leading-relaxed">
               <li>• Limitez-vous à 1 envoi global par jour.</li>
               <li>• Les messages apparaissent sous forme de notifications push et dans la boîte de réception système.</li>
               <li>• Soyez concis : le titre ne doit pas dépasser 40 caractères.</li>
             </ul>
           </div>

           <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-slate-100 dark:border-white/5">
             <div className="flex items-center gap-3 mb-6">
               <HistoryIcon className="text-slate-400" size={20} />
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Derniers envois</h3>
             </div>
             <p className="text-[10px] text-center  text-slate-400 py-4">Aucun historique disponible.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

// Internal icon fallbacks to avoid complex imports in this block
const UserIcon = (props: any) => <Users {...props} />;
const HeartIcon = (props: any) => <Heart {...props} />;
const Gem = (props: any) => <Star {...props} />;

export default AdminMessaging;
