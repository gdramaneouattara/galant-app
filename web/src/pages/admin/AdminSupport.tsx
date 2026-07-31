import React, { useState } from 'react';
import { Search, Send, ShieldCheck, Gem, User, MoreVertical, CheckCircle2, Clock, MessageSquare } from 'lucide-react';

const AdminSupport: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [msg, setMsg] = useState('');

  // Simulation de données de support
  const supportChats = [
    { id: '1', user: { name: 'Marc E.', role: 'Premium', status: 'verified', avatar: 'https://placehold.co/100', gender: 'MALE', score: 4.8 }, lastMsg: 'Bonjour, j\'ai un souci avec mon paiement...', time: '14:20', unread: true },
    { id: '2', user: { name: 'Hotel de la Falaise', role: 'Partner', status: 'verified', avatar: 'https://placehold.co/100', gender: 'BUSINESS', score: 5.0 }, lastMsg: 'Comment puis-je booster ma visibilité ce weekend ?', time: 'Hier', unread: false },
    { id: '3', user: { name: 'Sophie T.', role: 'User', status: 'pending', avatar: 'https://placehold.co/100', gender: 'FEMALE', score: 3.5 }, lastMsg: 'Mon KYC est toujours en attente.', time: 'Lun', unread: false },
  ];

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col xl:flex-row gap-6 transition-colors">
      {/* 1. Liste des Conversations Support */}
      <div className="w-full xl:w-80 bg-white dark:bg-slate-900 rounded-[2rem] xl:rounded-[2.5rem] shadow-xl dark:shadow-none border border-slate-50 dark:border-white/5 flex flex-col overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-50 dark:border-white/5 space-y-4">
          <h3 className="text-xl font-black italic text-slate-900 dark:text-white transition-colors">Support Inbox</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un ticket..."
              className="w-full bg-slate-50 dark:bg-slate-800 border-none px-10 py-3 rounded-xl outline-none text-sm font-medium text-slate-900 dark:text-white transition-colors"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {supportChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all text-left ${
                selectedChat?.id === chat.id ? 'bg-primary text-white shadow-lg shadow-red-200 dark:shadow-none' : 'hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0">
                <img src={chat.user.avatar} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm truncate text-inherit transition-colors">{chat.user.name}</span>
                  <span className={`text-[9px] font-black transition-colors ${selectedChat?.id === chat.id ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'}`}>{chat.time}</span>
                </div>
                <p className={`text-xs truncate font-medium transition-colors ${selectedChat?.id === chat.id ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{chat.lastMsg}</p>
              </div>
              {chat.unread && <div className="w-2 h-2 bg-primary rounded-full ring-4 ring-primary/10"></div>}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Zone de Chat */}
      <div className="min-h-[520px] flex-1 bg-white dark:bg-slate-900 rounded-[2rem] xl:rounded-[3rem] shadow-2xl dark:shadow-none border border-slate-50 dark:border-white/5 flex flex-col overflow-hidden transition-colors">
        {selectedChat ? (
          <>
            <div className="p-6 border-b border-slate-50 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 dark:border-white/10 transition-colors">
                  <img src={selectedChat.user.avatar} className="w-full h-full object-cover" alt="" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-slate-900 dark:text-white transition-colors">{selectedChat.user.name}</h4>
                    {selectedChat.user.status === 'verified' && <ShieldCheck size={16} className="text-blue-500" />}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 transition-colors">ID: #{selectedChat.id}12482</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-3 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 rounded-2xl hover:text-primary transition-colors"><CheckCircle2 size={20} /></button>
                <button className="p-3 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 rounded-2xl hover:text-primary transition-colors"><MoreVertical size={20} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30 dark:bg-slate-950/30 transition-colors">
               <div className="flex justify-start">
                 <div className="max-w-[70%] bg-white dark:bg-slate-800 p-4 rounded-3xl text-sm font-medium shadow-sm dark:shadow-none border border-slate-100 dark:border-white/5 rounded-tl-none transition-colors">
                   <span className="text-slate-900 dark:text-white">{selectedChat.lastMsg}</span>
                   <div className="text-[9px] mt-2 font-bold text-slate-400 dark:text-slate-500 transition-colors">{selectedChat.time}</div>
                 </div>
               </div>
               <div className="flex justify-end">
                 <div className="max-w-[70%] bg-primary text-white p-4 rounded-3xl text-sm font-medium shadow-lg shadow-red-200 dark:shadow-none rounded-tr-none">
                   Bonjour Marc, je regarde cela tout de suite. Pouvez-vous me confirmer le montant de la transaction ?
                   <div className="text-[9px] mt-2 font-bold text-white/60">14:22 • LU</div>
                 </div>
               </div>
            </div>

            <div className="p-6 border-t border-slate-50 dark:border-white/5 flex gap-4 transition-colors">
               <input
                 value={msg}
                 onChange={e => setMsg(e.target.value)}
                 className="flex-1 bg-slate-50 dark:bg-slate-800 px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 font-medium text-slate-900 dark:text-white transition-colors"
                 placeholder="Répondre à l'utilisateur..."
               />
               <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg hover:bg-black dark:hover:bg-slate-100 transition-all">
                 <Send size={20} />
               </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 gap-4 transition-colors">
            <MessageSquare size={80} strokeWidth={1} className="opacity-20" />
            <p className="font-bold italic transition-colors">Sélectionnez une discussion pour répondre.</p>
          </div>
        )}
      </div>

      {/* 3. Fiche Utilisateur Contextuelle */}
      {selectedChat && (
        <div className="w-full xl:w-80 space-y-6 overflow-y-auto no-scrollbar transition-colors">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl dark:shadow-none border border-slate-50 dark:border-white/5 space-y-6 transition-colors">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Fiche Client</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 transition-colors">Segment</span>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${selectedChat.user.role === 'Premium' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                  {selectedChat.user.role}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 transition-colors">Score Galant</span>
                <span className="flex items-center gap-1 font-black text-primary italic transition-colors">
                  <Gem size={12} /> {selectedChat.user.score}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 transition-colors">Dernière activité</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 transition-colors"><Clock size={12} /> À l'instant</span>
              </div>
            </div>

            <div className="pt-4 space-y-2 transition-colors">
               <button className="w-full py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-bold text-xs uppercase hover:bg-slate-100 dark:hover:bg-white/10 transition-all">Voir Profil Complet</button>
               <button className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 font-bold text-xs uppercase hover:bg-red-100 dark:hover:bg-red-900/40 transition-all">Suspendre Compte</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupport;
