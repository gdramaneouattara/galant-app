import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight, Clock, ShieldCheck } from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';

const PartnerChatsPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    let cancelled = false;
    const fetchChats = async () => {
      try {
        setLoading(true);
        const res = await apiRequest<{ chats: any[] }>('/api/venues/partner/chats', { requireAuth: true });
        if (!cancelled) {
          setChats((res.chats || []).map((chat) => ({ ...chat, client: chat.profiles })));
        }
      } catch {
        if (!cancelled) setChats([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchChats();
    return () => { cancelled = true; };
  }, [profile?.id]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/partner')} className="p-3 bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-white/10 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-primary transition-all">
          <ChevronRight className="rotate-180" size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-sans  tracking-tighter text-slate-900 dark:text-white transition-colors">Messages Clients</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Répondez aux demandes de vos membres Galant.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl dark:shadow-none border border-slate-100 dark:border-white/5 overflow-hidden transition-colors">
        {loading ? (
          <div className="p-20 text-center animate-pulse text-slate-300 dark:text-slate-700 font-bold  text-lg">Chargement de vos conversations...</div>
        ) : chats.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto text-slate-300 dark:text-slate-700 transition-colors">
               <MessageCircle size={40} />
            </div>
            <p className="text-slate-400 dark:text-slate-500 font-medium  text-lg transition-colors">Aucun client ne vous a encore contacté.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-white/5">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`, {
                  state: {
                    venueChatId: chat.id,
                    venueName: chat.client?.name || 'Client Galant',
                    venuePhoto: optimizedPhotoUrl(chat.client?.photos?.[0], chat.client?.photo_variants, 'thumb') || 'https://placehold.co/100',
                    presenceLabel: 'Client Galant'
                  }
                })}
                className="w-full p-8 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left group"
              >
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden border-2 border-slate-100 dark:border-white/10 shadow-md">
                      <img src={optimizedPhotoUrl(chat.client?.photos?.[0], chat.client?.photo_variants, 'thumb') || 'https://placehold.co/100'} className="w-full h-full object-cover" alt="" />
                    </div>
                    {chat.client?.is_verified && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white p-1 rounded-full border-4 border-white dark:border-slate-900 shadow-sm">
                        <ShieldCheck size={12} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xl font-sans  tracking-tighter text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                      {chat.client?.name || 'Client Galant'}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md uppercase tracking-prestige ${chat.unlocked_with_rose ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'bg-primary/10 text-primary'}`}>
                        {chat.unlocked_with_rose ? 'Achat Rose 🌹' : 'Membre Premium 💎'}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1 transition-colors">
                        <Clock size={12} /> {new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-300 dark:text-slate-700 group-hover:bg-primary group-hover:text-white transition-all shadow-inner dark:shadow-none">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerChatsPage;
