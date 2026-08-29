import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db, COLLECTIONS } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';
import {
  ChevronLeft, Heart, MapPin, MessageCircle, Rocket,
  ShieldCheck, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import InteractionPurchaseModal from '../components/InteractionPurchaseModal';
import ReportModal from '../components/ReportModal';
import OptimizedImage from '../components/OptimizedImage';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';
import ProfileFacts from '../components/ProfileFacts';

const ProfileDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, profile: myProfile, language } = useAuth();

  const [profile, setProfile] = useState<any>(location.state?.profile || null);
  const [loading, setLoading] = useState(!profile);
  const [liking, setLiking] = useState(false);
  const [superLiking, setSuperLiking] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const [purchaseModal, setPurchaseModal] = useState<{ open: boolean; type: 'SUPER_LIKE' | 'DIRECT_MESSAGE' }>({
    open: false,
    type: 'SUPER_LIKE'
  });
  const [isReportOpen, setIsReportOpen] = useState(false);

  const handleBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  useEffect(() => {
    if (!profile && id) {
      const fetchProfile = async () => {
        try {
          const docRef = doc(db, COLLECTIONS.PROFILES, id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile({ id: docSnap.id, ...docSnap.data() });
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [id, profile]);

  const onLike = async (isSuper = false) => {
    if (!id || liking || superLiking) return;

    if (isSuper && !myProfile?.is_premium) {
      setPurchaseModal({ open: true, type: 'SUPER_LIKE' });
      return;
    }

    if (isSuper) setSuperLiking(true);
    else setLiking(true);

    try {
      const res = await apiRequest<{ matched?: boolean }>('/api/matchmaking/swipe', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ targetUserId: id, direction: 'RIGHT', isSuperLike: isSuper }),
      });

      if (res.matched) {
        showAlert(t('match_title'), t('match_sub', { name: profile?.name }));
        navigate(`/chat/${id}`);
      } else {
        showAlert(t('success'), isSuper ? t('rose_sent') : t('like_sent'));
      }
    } catch (error: any) {
      if (error.message.includes('premium_required')) {
        setPurchaseModal({ open: true, type: 'SUPER_LIKE' });
      } else {
        showAlert(t('error'), error.message);
      }
    } finally {
      setLiking(false);
      setSuperLiking(false);
    }
  };

  const onDirectMessage = async () => {
    if (!id) return;
    try {
      const res = await apiRequest<{ matchId: string; unlocked: boolean }>('/api/messages/direct-thread', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ targetUserId: id }),
      });
      navigate(`/chat/${res.matchId}`);
    } catch (error: any) {
      if (error.message.includes('payment_required') || error.message.includes('subscription_required')) {
        setPurchaseModal({ open: true, type: 'DIRECT_MESSAGE' });
      } else {
        showAlert(t('error'), error.message);
      }
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!profile) return (
    <div className="text-center py-20">
      <p className="text-slate-400 font-bold">{language === 'en' ? 'Profile not found.' : 'Profil introuvable.'}</p>
      <button onClick={handleBack} className="mt-4 text-primary font-black">{language === 'en' ? 'Back' : 'Retour'}</button>
    </div>
  );

  const photos = profile.photos || [];
  const coverPhoto = selectedPhoto || photos[0] || 'https://placehold.co/600x800';
  const isBoosted = !!(profile.boosted_until && new Date(profile.boosted_until) > new Date());

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Colonne Gauche: Photos */}
        <div className="w-full md:w-1/2 space-y-4">
          <div className="relative aspect-[3/4] rounded-[3rem] overflow-hidden shadow-2xl dark:shadow-none border-4 border-white dark:border-slate-800 transition-colors">
            <OptimizedImage src={optimizedPhotoUrl(coverPhoto, profile.photo_variants, 'medium')} className="w-full h-full object-cover" alt="" eager />
            <button
              onClick={handleBack}
              className="absolute top-6 left-6 p-3 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-2xl transition-all"
            >
              <ChevronLeft size={24} />
            </button>

            {isBoosted && (
              <div className="absolute top-6 right-6 bg-secondary text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <Rocket size={16} fill="currentColor" />
                <span className="text-[10px] font-black uppercase">Boosté</span>
              </div>
            )}
          </div>

          {/* Galerie de miniatures */}
          {photos.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {photos.map((photo: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPhoto(photo)}
                  className={`flex-shrink-0 w-20 h-24 rounded-2xl overflow-hidden border-2 transition-all ${selectedPhoto === photo || (!selectedPhoto && idx === 0) ? 'border-primary scale-105' : 'border-transparent opacity-60'}`}
                >
                  <OptimizedImage src={optimizedPhotoUrl(photo, profile.photo_variants, 'thumb')} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Colonne Droite: Détails */}
        <div className="w-full md:w-1/2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-xl dark:shadow-none border border-slate-50 dark:border-white/5 space-y-6 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-sans  tracking-tighter text-slate-900 dark:text-white transition-colors">{profile.name}, {profile.age}</h2>
                {profile.is_verified && <ShieldCheck size={28} className="text-blue-500 fill-blue-50" />}
              </div>
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-medium uppercase tracking-prestige text-xs transition-colors">
                <MapPin size={16} className="text-primary" />
                {profile.city || 'Cameroun'}
                {profile.distance_km && <span> • {profile.distance_km.toFixed(1)} km</span>}
              </div>
              <div className="inline-block bg-rose-50 dark:bg-rose-900/20 text-primary px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-colors">
                🌹 {profile.roses_count || 0} {language === 'en' ? 'roses received' : 'roses reçues'}
              </div>
            </div>

            <ProfileFacts profile={profile} language={language} variant="panel" includeLocation includeStatus />

            <div className="space-y-3">
              <h3 className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige transition-colors">{language === 'en' ? 'About' : 'A propos'}</h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed  transition-colors">
                "{profile.bio || (language === 'en' ? 'This member prefers to keep a little mystery...' : 'Ce membre prefere garder une part de mystere...')}"
              </p>
            </div>

            {profile.interests?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige transition-colors">{language === 'en' ? 'Interests' : 'Centres d intérêt'}</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((it: string) => (
                    <span key={it} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                      {it}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Boutons d'Action */}
            <div className="grid grid-cols-1 gap-3 pt-4">
              <button
                onClick={() => onLike()}
                disabled={liking}
                className="bg-primary text-white py-5 rounded-2xl font-medium text-sm uppercase tracking-prestige flex items-center justify-center gap-3 shadow-lg shadow-red-100 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all"
              >
                {liking ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Heart size={20} fill="currentColor" />}
                {language === 'en' ? 'Send a Like' : 'Envoyer un Like'}
              </button>

              <button
                onClick={() => onLike(true)}
                disabled={superLiking}
                className="bg-white dark:bg-slate-800 border-2 border-primary text-primary dark:text-white py-5 rounded-2xl font-medium text-sm uppercase tracking-prestige flex items-center justify-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-95"
              >
                {superLiking ? <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div> : <span className="text-xl">🌹</span>}
                {language === 'en' ? 'Offer a bouquet' : 'Offrir un bouquet'}
              </button>

              <button
                onClick={onDirectMessage}
                className="bg-blue-600 text-white py-5 rounded-2xl font-medium text-sm uppercase tracking-prestige flex items-center justify-center gap-3 shadow-lg shadow-blue-100 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all"
              >
                <MessageCircle size={20} />
                {language === 'en' ? 'Direct Message' : 'Message Direct'}
              </button>
            </div>

            <div className="pt-8 border-t border-slate-50 dark:border-white/5 text-center">
               <button
                 onClick={() => setIsReportOpen(true)}
                 className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
               >
                 <ShieldAlert size={14} />
                 {language === 'en' ? 'Report this member' : 'Signaler ce membre'}
               </button>
            </div>
          </div>
        </div>
      </div>

      <InteractionPurchaseModal
        isOpen={purchaseModal.open}
        onClose={() => setPurchaseModal(prev => ({ ...prev, open: false }))}
        type={purchaseModal.type}
        userName={profile.name}
        onSuccess={() => onLike(purchaseModal.type === 'SUPER_LIKE')}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        reportedUserId={id!}
        userName={profile.name}
      />
    </div>
  );
};

export default ProfileDetailPage;
