import React, { useState } from 'react';
import { Search, Send, ShieldCheck, Gem, User, MoreVertical, CheckCircle2, Clock } from 'lucide-react';

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
    <div className="h-[calc(100vh-100px)] flex gap-6">
      {/* 1. Liste des Conversations Support */}
      <div className="w-80 bg-white rounded-[2.5rem] shadow-xl border border-slate-50 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-50 space-y-4">
          <h3 className="text-xl font-black italic">Support Inbox</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un ticket..."
              className="w-full bg-slate-50 border-none px-10 py-3 rounded-xl outline-none text-sm font-medium"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {supportChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all text-left ${
                selectedChat?.id === chat.id ? 'bg-primary text-white shadow-lg shadow-red-200' : 'hover:bg-slate-50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                <img src={chat.user.avatar} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm truncate">{chat.user.name}</span>
                  <span className={`text-[9px] font-black ${selectedChat?.id === chat.id ? 'text-white/60' : 'text-slate-400'}`}>{chat.time}</span>
                </div>
                <p className={`text-xs truncate font-medium ${selectedChat?.id === chat.id ? 'text-white/80' : 'text-slate-500'}`}>{chat.lastMsg}</p>
              </div>
              {chat.unread && <div className="w-2 h-2 bg-primary rounded-full ring-4 ring-primary/10"></div>}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Zone de Chat */}
      <div className="flex-1 bg-white rounded-[3rem] shadow-2xl border border-slate-50 flex flex-col overflow-hidden">
        {selectedChat ? (
          <>
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100">
                  <img src={selectedChat.user.avatar} className="w-full h-full object-cover" alt="" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-slate-900">{selectedChat.user.name}</h4>
                    {selectedChat.user.status === 'verified' && <ShieldCheck size={16} className="text-blue-500" />}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID: #{selectedChat.id}12482</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-primary transition-colors"><CheckCircle2 size={20} /></button>
                <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-primary transition-colors"><MoreVertical size={20} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
               <div className="flex justify-start">
                 <div className="max-w-[70%] bg-white p-4 rounded-3xl text-sm font-medium shadow-sm border border-slate-100 rounded-tl-none">
                   {selectedChat.lastMsg}
                   <div className="text-[9px] mt-2 font-bold text-slate-400">{selectedChat.time}</div>
                 </div>
               </div>
               <div className="flex justify-end">
                 <div className="max-w-[70%] bg-primary text-white p-4 rounded-3xl text-sm font-medium shadow-lg shadow-red-200 rounded-tr-none">
                   Bonjour Marc, je regarde cela tout de suite. Pouvez-vous me confirmer le montant de la transaction ?
                   <div className="text-[9px] mt-2 font-bold text-white/60">14:22 • LU</div>
                 </div>
               </div>
            </div>

            <div className="p-6 border-t border-slate-50 flex gap-4">
               <input
                 value={msg}
                 onChange={e => setMsg(e.target.value)}
                 className="flex-1 bg-slate-50 px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 font-medium"
                 placeholder="Répondre à l'utilisateur..."
               />
               <button className="bg-slate-900 text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg hover:bg-black transition-all">
                 <Send size={20} />
               </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4">
            <MessageSquare size={80} strokeWidth={1} className="opacity-20" />
            <p className="font-bold italic">Sélectionnez une discussion pour répondre.</p>
          </div>
        )}
      </div>

      {/* 3. Fiche Utilisateur Contextuelle */}
      {selectedChat && (
        <div className="w-80 space-y-6 overflow-y-auto no-scrollbar">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50 space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Fiche Client</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Segment</span>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${selectedChat.user.role === 'Premium' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                  {selectedChat.user.role}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Score Galant</span>
                <span className="flex items-center gap-1 font-black text-primary italic">
                  <Gem size={12} /> {selectedChat.user.score}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Dernière activité</span>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1"><Clock size={12} /> À l'instant</span>
              </div>
            </div>

            <div className="pt-4 space-y-2">
               <button className="w-full py-3 rounded-xl bg-slate-50 text-slate-900 font-bold text-xs uppercase hover:bg-slate-100 transition-all">Voir Profil Complet</button>
               <button className="w-full py-3 rounded-xl bg-red-50 text-red-500 font-bold text-xs uppercase hover:bg-red-100 transition-all">Suspendre Compte</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupport;
