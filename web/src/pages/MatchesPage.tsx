import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Gem, ChevronRight, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MatchesPage: React.FC = () => {
  const { user, matches, users, messages, loading } = useAuth();
  const navigate = useNavigate();

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
    return recentMatches
      .map(({ match, user: otherUser }) => {
        const thread = messages.filter((m) => m.match_id === match.id);
        const lastMessage = thread[thread.length - 1];
        const unreadCount = thread.filter((m) => !m.is_read && m.sender_id !== user.uid).length;
        const lastActivityAt = lastMessage?.created_at || match.created_at;

        return { match, user: otherUser, lastMessage, unreadCount, lastActivityAt };
      })
      .sort((a, b) => new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime());
  }, [user, messages, recentMatches]);

  if (loading) return (
    <div className="flex justify-center py-20 animate-pulse">
      <div className="h-12 w-12 bg-slate-200 rounded-full"></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black">Messages</h2>
          <p className="text-slate-500 font-medium">Vos connexions élégantes</p>
        </div>
      </div>

      {/* Nouveaux Matches (Horizontal) */}
      <section className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Nouveaux Matches</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {recentMatches.length === 0 ? (
            <div className="flex-1 bg-white p-6 rounded-[2rem] border border-slate-100 text-center">
              <p className="text-slate-400 font-bold text-sm italic">Swippez pour obtenir vos premiers matches !</p>
            </div>
          ) : (
            recentMatches.map(({ match, user: otherUser }) => (
              <button
                key={match.id}
                onClick={() => navigate(`/profile/${otherUser.id}`, { state: { profile: otherUser } })}
                className="flex-shrink-0 group flex flex-col items-center gap-2"
              >
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden group-hover:scale-105 transition-transform ring-2 ring-primary">
                  <img src={otherUser.photos?.[0]} className="w-full h-full object-cover" alt="" />
                </div>
                <span className="text-xs font-bold text-slate-700">{otherUser.name}</span>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Liste des Conversations */}
      <section className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Conversations</h3>
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden divide-y divide-slate-50">
          {conversations.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <MessageSquare size={40} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">Aucune conversation pour le moment.</p>
            </div>
          ) : (
            conversations.map(({ match, user: otherUser, lastMessage, unreadCount }) => (
              <button
                key={match.id}
                onClick={() => navigate(`/chat/${match.id}`)}
                className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="relative">
                  <img
                    src={otherUser.photos?.[0]}
                    className="w-16 h-16 rounded-2xl object-cover shadow-md"
                    alt=""
                  />
                  {unreadCount > 0 && (
                    <div className="absolute -top-2 -right-2 bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-lg">
                      {unreadCount}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-black text-slate-900 truncate">{otherUser.name}</span>
                    {otherUser.is_verified && <ShieldCheck size={14} className="text-blue-500" />}
                    {(otherUser.galanterie_score || 0) >= 4.5 && <Gem size={14} className="text-rose-600" />}
                  </div>
                  <p className="text-sm text-slate-500 truncate font-medium mt-0.5">
                    {lastMessage?.content || 'Commencez la discussion...'}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    {match.last_message_at ? new Date(match.last_message_at).toLocaleDateString() : ''}
                  </span>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default MatchesPage;
