import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronRight, Clock, User, ShieldCheck } from 'lucide-react';

const PartnerChatsPage: React.FC = () => {
  const { profile, users } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    // Récupérer les discussions liées à l'établissement de ce partenaire
    const q = query(
      collection(db, 'venue_chats'),
      where('partner_id', '==', profile.id),
      orderBy('last_message_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => {
        const data = doc.data();
        const client = users.find(u => u.id === data.user_id);
        return { id: doc.id, ...data, client };
      });
      setChats(chatList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, users]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/partner')} className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-400 hover:text-primary transition-all">
          <ChevronRight className="rotate-180" size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-black italic">Messages Clients</h2>
          <p className="text-slate-500 font-medium">Répondez aux demandes de vos membres Galant.</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center animate-pulse text-slate-300 font-bold italic text-lg">Chargement de vos conversations...</div>
        ) : chats.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-300">
               <MessageCircle size={40} />
            </div>
            <p className="text-slate-400 font-medium italic text-lg">Aucun client ne vous a encore contacté.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}?type=venue`)}
                className="w-full p-8 flex items-center justify-between hover:bg-slate-50 transition-all text-left group"
              >
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden border-2 border-slate-100 shadow-md">
                      <img src={chat.client?.photos?.[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" alt="" />
                    </div>
                    {chat.client?.is_verified && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white p-1 rounded-full border-4 border-white shadow-sm">
                        <ShieldCheck size={12} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors">
                      {chat.client?.name || 'Client Galant'}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${chat.unlocked_with_rose ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>
                        {chat.unlocked_with_rose ? 'Achat Rose 🌹' : 'Membre Premium 💎'}
                      </span>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={12} /> {new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
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
