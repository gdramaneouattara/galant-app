import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Gem, ChevronRight, MessageSquare, Search, Sparkles, Heart, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@shared/lib/api';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import OptimizedImage from '../components/OptimizedImage';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';

const MatchesPage: React.FC = () => {
  const { user, profile, matches, users, messages, loading, t } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [rosesInboxCount, setRosesInboxCount] = useState(0);
  const [venueChats, setVenueChats] = useState<any[]>([]);

  const likesCount = profile?.likes_count || 0;

  const fetchRosesInboxCount = useCallback(async () => {
    if (!user) {
      setRosesInboxCount(0);
      return;
    }

    try {
      const payload = await apiRequest<any[]>('/api/super-likes/received', { requireAuth: true });
      setRosesInboxCount((payload || []).filter((row) => row.status === 'PENDING' || row.is_countable).length);
    } catch {
      setRosesInboxCount(0);
    }
  }, [user]);

  useEffect(() => {
    void fetchRosesInboxCount();
  }, [fetchRosesInboxCount]);

  const fetchVenueChats = useCallback(async () => {
    if (!user) {
      setVenueChats([]);
      return;
    }

    try {
      const snapshot = await getDocs(query(
        collection(db, 'venue_chats'),
        where('user_id', '==', user.uid),
        orderBy('created_at', 'desc')
      ));

      const rows = await Promise.all(snapshot.docs.map(async (chatDoc) => {
        const data = chatDoc.data();
        const venueDoc = await getDoc(doc(db, 'venues', data.venue_id));
        return { id: chatDoc.id, ...data, venues: venueDoc.exists() ? { id: venueDoc.id, ...venueDoc.data() } : null };
      }));
      setVenueChats(rows.filter((row) => !!row.venues));
    } catch {
      setVenueChats([]);
    }
  }, [user]);

  useEffect(() => {
    void fetchVenueChats();
  }, [fetchVenueChats]);

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

  const filteredVenueChats = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return venueChats;
    return venueChats.filter((chat) => {
      const haystack = `${chat.venues?.name || ''} ${chat.venues?.benefit_description || ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [venueChats, searchQuery]);

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
            <h2 className="text-4xl font-serif italic tracking-tighter text-slate-900 dark:text-white leading-none">
              {t('messages')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 text-lg">
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
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Interest Notifications */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/likes')}
          className="relative bg-gradient-to-br from-rose-500 to-rose-600 dark:from-rose-900 dark:to-rose-950 p-6 rounded-[2.5rem] shadow-xl shadow-rose-500/20 text-white text-left overflow-hidden group hover:scale-[1.02] transition-all"
        >
          <div className="absolute -right-4 -bottom-4 bg-white/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
          <Heart size={24} className="mb-3 opacity-80 group-hover:scale-110 transition-transform" fill="currentColor" />
          <p className="text-2xl font-[1000] tracking-tighter leading-none">{likesCount}</p>
          <p className="text-[10px] font-medium uppercase tracking-prestige mt-1 opacity-80">Likes Reçus</p>
          {likesCount > 0 && <div className="absolute top-4 right-4 w-2 h-2 bg-white rounded-full animate-ping"></div>}
        </button>

        <button
          onClick={() => navigate('/roses')}
          className="relative bg-gradient-to-br from-amber-400 to-amber-600 dark:from-amber-900 dark:to-amber-950 p-6 rounded-[2.5rem] shadow-xl shadow-amber-500/20 text-white text-left overflow-hidden group hover:scale-[1.02] transition-all"
        >
          <div className="absolute -right-4 -bottom-4 bg-white/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
          <div className="text-2xl mb-2 group-hover:rotate-12 transition-transform">🌹</div>
          <p className="text-2xl font-[1000] tracking-tighter leading-none">{rosesInboxCount}</p>
          <p className="text-[10px] font-medium uppercase tracking-prestige mt-1 opacity-80">Roses a traiter</p>
          {rosesInboxCount > 0 && <div className="absolute top-4 right-4 w-2 h-2 bg-white rounded-full animate-ping"></div>}
        </button>
      </div>

      {/* Nouveaux Matches (Horizontal) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium uppercase tracking-prestige text-slate-400 dark:text-slate-500">{t('matches')}</h3>
          <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/5"></div>
        </div>

        <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
          {recentMatches.length === 0 ? (
            <div
              onClick={() => navigate('/')}
              className="flex-1 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-8 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/10 text-center cursor-pointer hover:border-primary/50 transition-all group shadow-sm hover:shadow-md"
            >
              <div className="bg-white dark:bg-slate-800 w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Sparkles size={28} className="text-primary animate-pulse" />
              </div>
              <p className="text-slate-900 dark:text-white font-extrabold text-lg mb-1">
                {t('no_matches_yet') || 'Prêt pour une rencontre ?'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-4">
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
                  <div className="w-20 h-20 rounded-[1.8rem] border-2 border-white dark:border-slate-800 shadow-xl overflow-hidden group-hover:scale-105 transition-transform ring-2 ring-primary/20">
                    <OptimizedImage src={optimizedPhotoUrl(otherUser.photos?.[0], otherUser.photo_variants, 'thumb')} className="w-full h-full object-cover" alt="" />
                  </div>
                  {/* Petit badge online optionnel */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                </div>
                <span className="text-xs font-serif italic tracking-tighter text-slate-800 dark:text-slate-300">{otherUser.name}</span>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Liste des Conversations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium uppercase tracking-prestige text-slate-400 dark:text-slate-500">Conversations</h3>
          <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/5"></div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-white/5 overflow-hidden transition-colors">
          {conversations.length === 0 && filteredVenueChats.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto transition-colors">
                <MessageSquare size={40} className="text-slate-200 dark:text-slate-700" />
              </div>
              <p className="font-bold text-slate-400 dark:text-slate-500 text-lg transition-colors">
                {searchQuery ? "Aucun résultat pour cette recherche." : "Aucune conversation pour le moment."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-white/5">
              {filteredVenueChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => navigate(`/chat/${chat.id}`, { state: { venueChatId: chat.id, venueName: chat.venues?.name } })}
                  className="w-full flex items-center gap-5 p-6 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-all text-left group"
                >
                  <div className="relative flex-shrink-0">
                    <OptimizedImage
                      src={chat.venues?.photo_url || 'https://placehold.co/100x100'}
                      className="w-16 h-16 rounded-2xl object-cover shadow-md group-hover:scale-105 transition-transform"
                      alt=""
                    />
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border border-white dark:border-slate-800">
                      Guide
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="font-serif italic tracking-tighter text-slate-900 dark:text-white text-lg group-hover:text-primary transition-colors">
                      {chat.venues?.name}
                    </span>
                    <p className="text-sm truncate font-medium text-slate-500 dark:text-slate-400">
                      {chat.venues?.benefit_description || 'Conversation avec un etablissement partenaire'}
                    </p>
                  </div>

                  <div className="bg-slate-100 dark:bg-white/5 p-1.5 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors text-slate-300 dark:text-slate-700">
                    <ChevronRight size={18} />
                  </div>
                </button>
              ))}
              {conversations.map(({ match, user: otherUser, lastMessage, unreadCount, lastActivityAt }) => (
                <button
                  key={match.id}
                  onClick={() => navigate(`/chat/${match.id}`)}
                  className="w-full flex items-center gap-5 p-6 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all text-left group"
                >
                  <div className="relative flex-shrink-0">
                    <OptimizedImage
                      src={optimizedPhotoUrl(otherUser.photos?.[0], otherUser.photo_variants, 'thumb')}
                      className="w-16 h-16 rounded-2xl object-cover shadow-md group-hover:scale-105 transition-transform"
                      alt=""
                    />
                    {unreadCount > 0 && (
                      <div className="absolute -top-2 -right-2 bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-800 shadow-lg animate-bounce">
                        {unreadCount}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-serif italic tracking-tighter text-slate-900 dark:text-white text-lg group-hover:text-primary transition-colors">
                        {otherUser.name}
                      </span>
                      {otherUser.is_verified && <ShieldCheck size={16} className="text-blue-500 fill-blue-50" />}
                      {(otherUser.galanterie_score || 0) >= 4.5 && <Gem size={16} className="text-rose-600" />}
                    </div>
                    <p className={`text-sm truncate font-medium ${unreadCount > 0 ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                      {lastMessage?.content || 'Commencez la discussion...'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <span className="text-[10px] font-medium uppercase tracking-prestige text-slate-400 dark:text-slate-500">
                      {lastActivityAt ? new Date(lastActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <div className="bg-slate-100 dark:bg-white/5 p-1.5 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors text-slate-300 dark:text-slate-700">
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
