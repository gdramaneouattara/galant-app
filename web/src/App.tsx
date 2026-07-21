import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// Pages
import DiscoverPage from './pages/DiscoverPage';
import AuthPage from './pages/AuthPage';
import PartnerSignupPage from './pages/PartnerSignupPage';
import LocationSetupPage from './pages/LocationSetupPage';
import MatchesPage from './pages/MatchesPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import ProfileDetailPage from './pages/ProfileDetailPage';
import PremiumPage from './pages/PremiumPage';
import VerifyPage from './pages/VerifyPage';
import PartnerDashboard from './pages/PartnerDashboard';
import PartnerChatsPage from './pages/PartnerChatsPage';
import CreateEventPage from './pages/CreateEventPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import AgendaPage from './pages/AgendaPage';
import GuidePage from './pages/GuidePage';
import ExperiencesPage from './pages/ExperiencesPage';
import StoriesPage from './pages/StoriesPage';
import LikesInboxPage from './pages/LikesInboxPage';
import {
  Crown,
  Briefcase,
  Calendar,
  Languages,
  Film,
  Heart as HeartIcon,
  LayoutDashboard,
  MapPin,
  Compass,
  MessageSquare,
  User as UserIcon,
  Search
} from 'lucide-react';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Admin
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPricing from './pages/admin/AdminPricing';
import logoImg from './assets/galant-logo.png';
import AdminSupport from './pages/admin/AdminSupport';
import AdminKyc from './pages/admin/AdminKyc';
import AdminUsers from './pages/admin/AdminUsers';
import AdminFinances from './pages/admin/AdminFinances';

const AuthButton: React.FC = () => {
  const { user, profile } = useAuth();
  if (user) {
    return (
      <div className="flex items-center gap-4">
        {profile?.is_admin && (
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
          <span className="hidden sm:inline font-bold text-sm text-slate-700 group-hover:text-primary transition-colors">{profile?.name || user.email}</span>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-primary overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
            <img
              src={profile?.photos?.[0] || 'https://placehold.co/100x100?text=User'}
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
      Connexion
    </Link>
  );
};

const LanguageSwitcher = () => {
  const { language, setLanguage } = useAuth();
  return (
    <button
      onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all font-black text-[10px] uppercase tracking-wider"
    >
      <Languages size={14} />
      {language}
    </button>
  );
};

const MobileNav: React.FC = () => {
  const { profile, t } = useAuth();
  return (
    <nav className="md:hidden bg-white/90 backdrop-blur-lg border-t border-slate-200 py-3 px-2 flex justify-around items-center fixed bottom-0 left-0 right-0 z-50">
      <Link to="/" className="flex flex-col items-center gap-1 text-slate-400 group">
        <div className="p-1 group-hover:text-primary transition-colors">
          <Search size={22} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-tighter">{t('discover')}</span>
      </Link>

      <Link to="/stories" className="flex flex-col items-center gap-1 text-slate-400 group">
        <div className="p-1 group-hover:text-primary transition-colors">
          <Film size={22} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-tighter">{t('stories')}</span>
      </Link>

      <Link to="/experiences" className="flex flex-col items-center gap-1 text-slate-400 group">
        <div className="p-1 group-hover:text-primary transition-colors">
          <Compass size={22} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-tighter">Sorties</span>
      </Link>

      <Link to="/matches" className="flex flex-col items-center gap-1 text-slate-400 group">
        <div className="p-1 group-hover:text-primary transition-colors">
          <MessageSquare size={22} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-tighter">{t('messages')}</span>
      </Link>

      <Link to="/profile" className="flex flex-col items-center gap-1 text-slate-400 group">
        <div className="p-1 group-hover:text-primary transition-colors relative">
          <UserIcon size={22} />
          {profile?.is_premium && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white"></div>
          )}
        </div>
        <span className="text-[9px] font-black uppercase tracking-tighter">Moi</span>
      </Link>
    </nav>
  );
};

const Header = () => {
  const { t } = useAuth();
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 py-4 px-6 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <img src={logoImg} alt="Galant Logo" className="w-8 h-8 rounded-lg shadow-sm group-hover:scale-105 transition-transform" />
            <h1 className="text-2xl font-black text-primary tracking-tighter">
              GALANT
            </h1>
          </Link>
          <nav className="hidden md:flex gap-8 font-bold text-sm text-slate-500">
            <Link to="/" className="hover:text-primary transition-colors">{t('discover')}</Link>
            <Link to="/stories" className="hover:text-primary transition-colors">{t('stories')}</Link>
            <Link to="/matches" className="hover:text-primary transition-colors">{t('messages')}</Link>
            <Link to="/agenda" className="hover:text-primary transition-colors">{t('agenda')}</Link>
            <Link to="/guide" className="hover:text-primary transition-colors">Guide</Link>
            <Link to="/premium" className="text-amber-500 hover:text-amber-600 transition-colors flex items-center gap-1">
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
  const { user } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';
  const isWelcomePage = location.pathname === '/' && !user;

  return (
    <div className={`min-h-screen flex flex-col font-sans ${(isAuthPage || isWelcomePage) ? '' : 'bg-slate-50'}`}>
      {/* Background Image Unifiée pour Auth et Welcome */}
      {(isAuthPage || isWelcomePage) && (
        <div
          className="fixed inset-0 w-full h-full z-0 animate-pulse-slow"
          style={{
            backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.8)), url("/auth-bg.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#0f172a'
          }}
        />
      )}

      {(!isAuthPage && !isWelcomePage) && <Header />}

      <main className={`relative z-10 flex-1 w-full ${(isAuthPage || isWelcomePage) ? '' : 'max-w-6xl mx-auto p-4 md:p-8 mb-20 md:mb-0'}`}>
        <Routes>
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/cgu" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/location-setup" element={<LocationSetupPage />} />
          <Route path="/partner-signup" element={<PartnerSignupPage />} />
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/likes" element={<LikesInboxPage />} />
          <Route path="/chat/:matchId" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:id" element={<ProfileDetailPage />} />
          <Route path="/premium" element={<PremiumPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/experiences" element={<ExperiencesPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/partner" element={<PartnerDashboard />} />
          <Route path="/partner/chats" element={<PartnerChatsPage />} />
          <Route path="/partner/create-event" element={<CreateEventPage />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="kyc" element={<AdminKyc />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="pricing" element={<AdminPricing />} />
            <Route path="finances" element={<AdminFinances />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAuthPage && <MobileNav />}
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
