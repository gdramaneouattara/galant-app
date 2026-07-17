import React, { useState } from 'react';
import { fbAuth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { showAlert } from '@shared/lib/ui-bridge';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, CheckSquare, Square } from 'lucide-react';

const AuthPage: React.FC = () => {
  const { t } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !hasAcceptedLegal) {
      showAlert('Consentement requis', 'Veuillez accepter les CGU et la Politique de confidentialité.');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(fbAuth, email, password);
        navigate('/');
      } else {
        await createUserWithEmailAndPassword(fbAuth, email, password);
        navigate('/location-setup');
      }
    } catch (error: any) {
      showAlert(t('error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md flex flex-col items-center py-10">
        {/* Header avec Logo */}
        <div className="mb-10 text-center flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top duration-700">
          <img src="/pwa-192x192.png" alt="Galant Logo" className="w-20 h-20 rounded-[2rem] shadow-2xl border-4 border-white/20" />
          <div>
            <h1 className="text-5xl font-[900] text-white tracking-tighter italic mb-2 drop-shadow-2xl">
              GALANT
            </h1>
            <div className="h-1.5 w-12 bg-primary mx-auto rounded-full shadow-lg shadow-red-500/50"></div>
          </div>
        </div>

        <div className="w-full p-8 bg-white/95 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-white/20">
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-3xl font-black text-slate-900 leading-none">
              {isLogin ? t('login') : t('welcome')}
            </h2>
            <p className="text-slate-500 mt-3 font-medium text-sm">
              {isLogin ? 'Heureux de vous revoir parmi nous.' : t('welcome_subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Adresse Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                placeholder="exemple@galant.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <button
                type="button"
                onClick={() => setHasAcceptedLegal(!hasAcceptedLegal)}
                className="flex items-start gap-3 text-left group"
              >
                <div className={`mt-0.5 shrink-0 transition-colors ${hasAcceptedLegal ? 'text-primary' : 'text-slate-300 group-hover:text-slate-400'}`}>
                  {hasAcceptedLegal ? <CheckSquare size={20} /> : <Square size={20} />}
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                  J'accepte les <Link to="/cgu" className="text-primary hover:underline">CGU</Link> et la <Link to="/privacy" className="text-primary hover:underline">Politique de confidentialité</Link>.
                </p>
              </button>
            )}

            <button
              disabled={loading || (!isLogin && !hasAcceptedLegal)}
              className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-red-100 disabled:opacity-50 mt-4"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Patientez...</span>
                </div>
              ) : (isLogin ? t('login') : t('continue'))}
            </button>
          </form>

          <div className="mt-10 flex flex-col gap-4">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-500 font-bold hover:text-primary transition-colors text-sm uppercase"
            >
              {isLogin ? "Pas encore membre ? S'inscrire" : "Déjà un compte ? Se connecter"}
            </button>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 text-center">
            <button
              onClick={() => navigate('/partner-signup')}
              className="group flex flex-col items-center gap-2 mx-auto"
            >
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-primary transition-colors">Vous êtes un établissement ?</span>
              <span className="text-sm font-black italic text-slate-900 border-b-2 border-slate-900 group-hover:border-primary group-hover:text-primary transition-all">Devenez Partenaire Galant</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
