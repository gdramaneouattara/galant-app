import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Gem, ChevronRight, MessageSquare, Search, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MatchesPage: React.FC = () => {
  const { user, matches, users, messages, loading, t } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const recentMatches = useMemo(() => {
    if (!user) return [];
    return matches
      .map((match) => {
        const otherUserId = match.user_one_id === user.uid ? match.user_two_id : match.user_one_id;
        const otherUser = users.find((u) => u.id === otherUserId);
        if (!otherUser) return null;
        return { match, user: otherUser };
      })
      .filter((entry): entry is { match: any; user: any } => !!entry);
  }, [user, matches, users]);

  const conversations = useMemo(() => {
    if (!user) return [];
    const base = recentMatches
      .map(({ match, user: otherUser }) => {
        const thread = messages.filter((m) => m.match_id === match.id);
        const lastMessage = thread[thread.length - 1];
        const unreadCount = thread.filter((m) => !m.is_read && m.sender_id !== user.uid).length;
        const lastActivityAt = lastMessage?.created_at || match.created_at;

        return { match, user: otherUser, lastMessage, unreadCount, lastActivityAt };
      })
      .sort((a, b) => new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime());

    if (!searchQuery) return base;
    return base.filter(c => c.user.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [user, messages, recentMatches, searchQuery]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-10">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-slate-900 leading-none">
              {t('messages')}
            </h2>
            <p className="text-slate-500 font-medium mt-2 text-lg">
              {t('messages_subtitle') || 'Vos connexions élégantes'}
            </p>
          </div>
        </div>

        {/* Barre de Recherche Dynamique */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search size={20} className="text-slate-400 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder={t('search_conversations') || "Rechercher une conversation..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Nouveaux Matches (Horizontal) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{t('matches')}</h3>
          <div className="h-[1px] flex-1 bg-slate-100"></div>
        </div>

        <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
          {recentMatches.length === 0 ? (
            <div
              onClick={() => navigate('/')}
              className="flex-1 bg-gradient-to-br from-white to-slate-50 p-8 rounded-[2.5rem] border border-dashed border-slate-300 text-center cursor-pointer hover:border-primary/50 transition-all group shadow-sm hover:shadow-md"
            >
              <div className="bg-white w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Sparkles size={28} className="text-primary animate-pulse" />
              </div>
              <p className="text-slate-900 font-extrabold text-lg mb-1">
                {t('no_matches_yet') || 'Prêt pour une rencontre ?'}
              </p>
              <p className="text-slate-500 font-medium text-sm mb-4">
                {t('swipe_to_start') || 'Swippez pour obtenir vos premiers matches !'}
              </p>
              <button className="bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
                {t('discover_profiles') || 'Découvrir'}
              </button>
            </div>
          ) : (
            recentMatches.map(({ match, user: otherUser }) => (
              <button
                key={match.id}
                onClick={() => navigate(`/profile/${otherUser.id}`, { state: { profile: otherUser } })}
                className="flex-shrink-0 group flex flex-col items-center gap-3"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-[1.8rem] border-2 border-white shadow-xl overflow-hidden group-hover:scale-105 transition-transform ring-2 ring-primary/20">
                    <img src={otherUser.photos?.[0]} className="w-full h-full object-cover" alt="" />
                  </div>
                  {/* Petit badge online optionnel */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <span className="text-xs font-black text-slate-800 tracking-tight">{otherUser.name}</span>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Liste des Conversations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Conversations</h3>
          <div className="h-[1px] flex-1 bg-slate-100"></div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
          {conversations.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <MessageSquare size={40} className="text-slate-200" />
              </div>
              <p className="font-bold text-slate-400 text-lg">
                {searchQuery ? "Aucun résultat pour cette recherche." : "Aucune conversation pour le moment."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {conversations.map(({ match, user: otherUser, lastMessage, unreadCount, lastActivityAt }) => (
                <button
                  key={match.id}
                  onClick={() => navigate(`/chat/${match.id}`)}
                  className="w-full flex items-center gap-5 p-6 hover:bg-slate-50/50 transition-all text-left group"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={otherUser.photos?.[0]}
                      className="w-16 h-16 rounded-2xl object-cover shadow-md group-hover:scale-105 transition-transform"
                      alt=""
                    />
                    {unreadCount > 0 && (
                      <div className="absolute -top-2 -right-2 bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-lg animate-bounce">
                        {unreadCount}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-slate-900 text-lg tracking-tight group-hover:text-primary transition-colors">
                        {otherUser.name}
                      </span>
                      {otherUser.is_verified && <ShieldCheck size={16} className="text-blue-500 fill-blue-50" />}
                      {(otherUser.galanterie_score || 0) >= 4.5 && <Gem size={16} className="text-rose-600" />}
                    </div>
                    <p className={`text-sm truncate font-medium ${unreadCount > 0 ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                      {lastMessage?.content || 'Commencez la discussion...'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {lastActivityAt ? new Date(lastActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <div className="bg-slate-100 p-1.5 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors text-slate-300">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MatchesPage;
