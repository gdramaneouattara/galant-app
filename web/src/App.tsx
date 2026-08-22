import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// Pages
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';
import {
  Crown,
  Briefcase,
  Calendar,
  Languages,
  Heart as HeartIcon,
  LayoutDashboard,
  LayoutGrid,
  MapPin,
  Compass,
  MessageSquare,
  User as UserIcon,
  Search
} from 'lucide-react';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import WelcomeVernissage from './components/WelcomeVernissage';

// Admin
import logoImg from './assets/galant-logo-web.png';
import { hasAdminProfileAccess } from './lib/adminAccess';

const DiscoverPage = lazy(() => import('./pages/DiscoverPage'));
const DiscoverGridPage = lazy(() => import('./pages/DiscoverGridPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const PartnerSignupPage = lazy(() => import('./pages/PartnerSignupPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const MatchesPage = lazy(() => import('./pages/MatchesPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ProfileDetailPage = lazy(() => import('./pages/ProfileDetailPage'));
const PaymentReturnPage = lazy(() => import('./pages/PaymentReturnPage'));
const VerifyPage = lazy(() => import('./pages/VerifyPage'));
const PartnerDashboard = lazy(() => import('./pages/PartnerDashboard'));
const PartnerPremiumPage = lazy(() => import('./pages/PartnerPremiumPage'));
const PartnerChatsPage = lazy(() => import('./pages/PartnerChatsPage'));
const CreateEventPage = lazy(() => import('./pages/CreateEventPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const AgendaPage = lazy(() => import('./pages/AgendaPage'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const ExperiencesPage = lazy(() => import('./pages/ExperiencesPage'));
const StoriesPage = lazy(() => import('./pages/StoriesPage'));
const StorePage = lazy(() => import('./pages/StorePage'));
const MarketPage = lazy(() => import('./pages/MarketPage'));
const PartnerDiscoveryPage = lazy(() => import('./pages/PartnerDiscoveryPage'));
const VenueDetailPage = lazy(() => import('./pages/VenueDetailPage'));
const SentinelPage = lazy(() => import('./pages/SentinelPage'));
const AppsPage = lazy(() => import('./pages/AppsPage'));
const LikesInboxPage = lazy(() => import('./pages/LikesInboxPage'));
const RosesInboxPage = lazy(() => import('./pages/RosesInboxPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminPricing = lazy(() => import('./pages/admin/AdminPricing'));
const AdminSupport = lazy(() => import('./pages/admin/AdminSupport'));
const AdminKyc = lazy(() => import('./pages/admin/AdminKyc'));
const AdminMessaging = lazy(() => import('./pages/admin/AdminMessaging'));
const AdminVenues = lazy(() => import('./pages/admin/AdminVenues'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminGuideSeeder = lazy(() => import('./pages/admin/AdminGuideSeeder'));
const AdminAgendaSeeder = lazy(() => import('./pages/admin/AdminAgendaSeeder'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminFinances = lazy(() => import('./pages/admin/AdminFinances'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));

const PageLoader: React.FC = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
  </div>
);

const AuthButton: React.FC = () => {
  const { user, profile, t } = useAuth();
  if (user) {
    return (
      <div className="flex items-center gap-4">
        {hasAdminProfileAccess(profile, user.uid) && (
          <Link to="/admin" className="hidden md:flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider border border-primary/20 shadow-sm hover:bg-primary hover:text-white transition-all">
            <LayoutDashboard size={14} />
            ADMIN
          </Link>
        )}
        {profile?.is_partner && (
          <Link to="/partner" className="hidden md:flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg hover:bg-black transition-all">
            <Briefcase size={14} />
            BUSINESS
          </Link>
        )}
        <Link to="/profile" className="flex items-center gap-3 group">
          <span className="hidden sm:inline font-bold text-sm text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">{profile?.name || user.email}</span>
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-primary overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
            <img
              src={optimizedPhotoUrl(profile?.photos?.[0], profile?.photo_variants, 'thumb') || 'https://placehold.co/100x100?text=User'}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </Link>
      </div>
    );
  }
  return (
    <Link
      to="/auth"
      className="bg-primary text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
    >
      {t('login')}
    </Link>
  );
};

const LanguageSwitcher = () => {
  const { language, setLanguage } = useAuth();
  const nextLanguage = language === 'fr' ? 'en' : 'fr';
  const label = language === 'fr' ? 'Switch to English' : 'Passer en français';

  return (
    <button
      onClick={() => setLanguage(nextLanguage)}
      title={label}
      aria-label={label}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20 transition-all font-black text-[10px] uppercase tracking-wider"
    >
      <Languages size={14} />
      {language}
    </button>
  );
};

const MobileNav: React.FC = () => {
  const { profile, t } = useAuth();
  return (
    <nav className="md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-white/10 py-3 px-2 flex justify-around items-center fixed bottom-0 left-0 right-0 z-50 transition-colors">
      <Link to="/" className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500 group">
        <div className="p-1 group-hover:text-primary transition-colors">
          <Search size={22} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-tighter">{t('discover')}</span>
      </Link>

      <Link to="/matches" className="flex flex-col items-center gap-1 text-slate-400 group">
        <div className="p-1 group-hover:text-primary transition-colors">
          <MessageSquare size={22} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-tighter">{t('messages')}</span>
      </Link>

      <Link to="/experiences" className="flex flex-col items-center gap-1 text-slate-400 group">
        <div className="p-1 group-hover:text-primary transition-colors">
          <Compass size={22} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-tighter">Guide</span>
      </Link>

      <Link to="/apps" className="flex flex-col items-center gap-1 text-slate-400 group">
        <div className="p-1 group-hover:text-primary transition-colors">
          <LayoutGrid size={22} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-tighter">{t('apps')}</span>
      </Link>

      <Link to="/profile" className="flex flex-col items-center gap-1 text-slate-400 group">
        <div className="p-1 group-hover:text-primary transition-colors relative">
          <UserIcon size={22} />
          {profile?.is_premium && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white"></div>
          )}
        </div>
        <span className="text-[9px] font-black uppercase tracking-tighter">{t('me')}</span>
      </Link>
    </nav>
  );
};

const Header = () => {
  const { t } = useAuth();
  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 py-4 px-6 sticky top-0 z-50 transition-colors">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <img src={logoImg} alt="Galant Logo" className="w-8 h-8 rounded-lg shadow-sm group-hover:scale-105 transition-transform" />
            <h1 className="text-2xl font-black text-primary tracking-tighter">
              GALANT
            </h1>
          </Link>
          <nav className="hidden md:flex gap-8 font-bold text-sm text-slate-500 dark:text-slate-400">
            <Link to="/" className="hover:text-primary transition-colors">{t('discover')}</Link>
            <Link to="/matches" className="hover:text-primary transition-colors">{t('messages')}</Link>
            <Link to="/experiences" className="hover:text-primary transition-colors">Guide</Link>
            <Link to="/apps" className="hover:text-primary transition-colors">{t('apps')}</Link>
            <Link to="/store" className="text-amber-500 hover:text-amber-600 transition-colors flex items-center gap-1">
              <Crown size={14} fill="currentColor" />
              Premium
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <AuthButton />
        </div>
      </div>
    </header>
  );
};

const AppContent: React.FC = () => {
  const { user, profile, loading, activeTheme, isFakeCallActive, completeVernissage } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = location.pathname === '/auth';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isChatRoute = location.pathname.startsWith('/chat');
  const isOnboardingPage = location.pathname === '/onboarding';
  const isWelcomePage = location.pathname === '/' && !user;

  // Global Redirect Logic for incomplete profiles or unverified emails
  React.useEffect(() => {
    if (loading || !user) return;

    const path = location.pathname;

    // 1. Force verification if email not verified
    if (!user.emailVerified) {
      if (path !== '/auth') {
        navigate('/auth');
      }
    }
    // 2. Force onboarding if profile missing
    else if (!profile) {
      if (path !== '/onboarding' && path !== '/auth') {
        navigate('/onboarding');
      }
    }
  }, [user, profile, loading, location.pathname, navigate]);

  return (
    <div className={`min-h-screen flex flex-col font-sans ${activeTheme === 'dark' ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`}>
      {/* Background Image Unifiée pour Auth et Welcome */}
      {(isAuthPage || isWelcomePage) && (
        <div
          className="fixed inset-0 w-full h-full z-0 animate-pulse-slow"
          style={{
            backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.8)), url("auth-bg.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#0f172a'
          }}
        />
      )}

      {(!isAuthPage && !isWelcomePage && !isAdminRoute && !isFakeCallActive) && <Header />}

      {profile && profile.onboarding_completed && profile.has_seen_vernissage === false && (
        <WelcomeVernissage onComplete={() => void completeVernissage()} />
      )}

      <main className={`relative z-10 flex-1 w-full ${(isAuthPage || isWelcomePage || isAdminRoute || isFakeCallActive || isChatRoute) ? '' : 'max-w-6xl mx-auto p-4 md:p-8 mb-20 md:mb-0'}`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<DiscoverPage />} />
            <Route path="/discover-grid" element={<DiscoverGridPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/cgu" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/partner-signup" element={<PartnerSignupPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/partner-discovery" element={<PartnerDiscoveryPage />} />
            <Route path="/venue/:id" element={<VenueDetailPage />} />
            <Route path="/sentinel" element={<SentinelPage />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="/apps" element={<AppsPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/likes" element={<LikesInboxPage />} />
            <Route path="/roses" element={<RosesInboxPage />} />
            <Route path="/boost" element={<Navigate to="/store" replace />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/chat/:matchId" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:id" element={<ProfileDetailPage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/premium" element={<Navigate to="/store" replace />} />
            <Route path="/payment-return" element={<PaymentReturnPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/experiences" element={<ExperiencesPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/partner" element={<PartnerDashboard />} />
            <Route path="/partner-premium" element={<PartnerPremiumPage />} />
            <Route path="/partner/chats" element={<PartnerChatsPage />} />
            <Route path="/partner/create-event" element={<CreateEventPage />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="kyc" element={<AdminKyc />} />
              <Route path="venues" element={<AdminVenues />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="pricing" element={<AdminPricing />} />
              <Route path="messaging" element={<AdminMessaging />} />
              <Route path="finances" element={<AdminFinances />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="audit" element={<AdminAuditLogs />} />
              <Route path="seeder" element={<AdminGuideSeeder />} />
              <Route path="agenda-seeder" element={<AdminAgendaSeeder />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      {(!isAuthPage && !isAdminRoute && !isFakeCallActive) && <MobileNav />}
      <PWAInstallPrompt />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
