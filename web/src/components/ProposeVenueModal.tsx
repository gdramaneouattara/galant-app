import React, { useMemo, useState } from 'react';
import { X, Send, Search, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  venue: any;
}

const copy = {
  fr: {
    title: 'Proposer ce lieu',
    search: 'Rechercher un match...',
    empty: 'Aucun match trouve.',
    sentTitle: 'Proposition envoyée',
    sentBody: (name: string) => `Votre suggestion a ete envoyée a ${name}.`,
    message: (venueName: string) => `Je nous propose un rendez-vous a ${venueName} !`,
    error: 'Erreur',
    footer: 'Votre match pourra ouvrir la fiche et donner son avis dans le chat.',
    close: 'Fermer'
  },
  en: {
    title: 'Suggest this place',
    search: 'Search a match...',
    empty: 'No match found.',
    sentTitle: 'Suggestion sent',
    sentBody: (name: string) => `Your suggestion was sent to ${name}.`,
    message: (venueName: string) => `I suggest we meet at ${venueName}!`,
    error: 'Error',
    footer: 'Your match can open the venue card and share an opinion in chat.',
    close: 'Close'
  }
};

const buildVenueSuggestionPayload = (venue: any) => ({
  id: venue.id,
  name: venue.name,
  photo_url: venue.photo_url,
  photo_variants: venue.photo_variants || {},
  venue_type: venue.venue_type || '',
  city: venue.city || '',
  address: venue.address || '',
  description: venue.description || '',
  rating: venue.rating || null,
  google_maps_uri: venue.google_maps_uri || '',
  phone_number: venue.phone_number || '',
  benefit_description: venue.benefit_description || ''
});

const ProposeVenueModal: React.FC<Props> = ({ isOpen, onClose, venue }) => {
  const { user, matches, users, language } = useAuth();
  const [search, setSearch] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const c = copy[language] || copy.fr;

  const activeMatches = useMemo(() => {
    if (!user) return [];
    return matches
      .map((match) => {
        const otherUserId = match.user_one_id === user.uid ? match.user_two_id : match.user_one_id;
        const otherUser = users.find((candidate) => candidate.id === otherUserId);
        if (!otherUser) return null;
        return { match, user: otherUser };
      })
      .filter((entry): entry is { match: any; user: any } => !!entry)
      .filter((entry) => entry.user.name.toLowerCase().includes(search.toLowerCase()));
  }, [user, matches, users, search]);

  if (!isOpen || !venue) return null;

  const handlePropose = async (matchId: string, otherUserId: string, otherUserName: string) => {
    setSendingId(matchId);
    try {
      await apiRequest('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          matchId,
          recipientId: otherUserId,
          content: c.message(venue.name),
          messageType: 'VENUE_SUGGESTION',
          metadata: {
            venue: buildVenueSuggestionPayload(venue)
          }
        })
      });

      showAlert(c.sentTitle, c.sentBody(otherUserName));
      onClose();
    } catch (error: any) {
      showAlert(c.error, error.message);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh] border border-slate-100 dark:border-white/10">
        <div className="p-8 border-b border-slate-50 dark:border-white/10 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-sans  text-slate-900 dark:text-white">{c.title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full text-slate-300" aria-label={c.close}>
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl">
            <img src={optimizedPhotoUrl(venue.photo_url, venue.photo_variants, 'thumb')} className="w-12 h-12 rounded-xl object-cover" alt="" />
            <div className="min-w-0">
              <p className="font-bold text-sm truncate text-slate-900 dark:text-white">{venue.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-1">
                <MapPin size={10} /> {venue.city || venue.address || 'Guide Galant'}
              </p>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={c.search}
              className="w-full bg-slate-50 dark:bg-white/5 border-none px-10 py-3 rounded-xl outline-none text-sm font-medium text-slate-900 dark:text-white"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {activeMatches.length === 0 ? (
            <div className="py-10 text-center text-slate-300 font-bold ">
              {c.empty}
            </div>
          ) : (
            activeMatches.map(({ match, user: otherUser }) => (
              <button
                key={match.id}
                onClick={() => handlePropose(match.id, otherUser.id, otherUser.name)}
                disabled={!!sendingId}
                className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left border border-transparent hover:border-slate-100 dark:hover:border-white/10 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 dark:border-white/10 flex-shrink-0">
                    <img src={optimizedPhotoUrl(otherUser.photos?.[0], otherUser.photo_variants, 'thumb')} className="w-full h-full object-cover" alt="" />
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{otherUser.name}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                  {sendingId === match.id ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50/50 dark:bg-white/5 border-t border-slate-50 dark:border-white/10">
          <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
            {c.footer}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProposeVenueModal;
