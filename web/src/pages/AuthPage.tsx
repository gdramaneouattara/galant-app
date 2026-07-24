import React, { useState } from 'react';
import { fbAuth } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { showAlert } from '@shared/lib/ui-bridge';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, CheckSquare, Square, Lock, ArrowLeft } from 'lucide-react';

const AuthPage: React.FC = () => {
  const { t } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !hasAcceptedLegal) {
      showAlert('Consentement requis', 'Veuillez accepter les CGU et la Politique de confidentialité.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(fbAuth, email, password);
        navigate('/');
      } else if (mode === 'signup') {
        await createUserWithEmailAndPassword(fbAuth, email, password);
        navigate('/onboarding');
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(fbAuth, email.trim().toLowerCase());
        showAlert('Email envoyé', 'Vérifiez votre boîte de réception pour réinitialiser votre mot de passe.');
        setMode('login');
      }
    } catch (error: any) {
      console.error('Auth Error:', error.code);
      let friendlyMessage = "Une erreur est survenue lors de l'authentification.";

      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = "Cette adresse e-mail est déjà inscrite. Veuillez vous connecter à votre compte existant.";
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        friendlyMessage = "Identifiants incorrects. Veuillez vérifier votre e-mail et votre mot de passe.";
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = "L'adresse e-mail saisie n'est pas valide.";
      } else if (error.code === 'auth/weak-password') {
        friendlyMessage = "Le mot de passe doit contenir au moins 6 caractères.";
      } else if (error.code === 'auth/user-disabled') {
        friendlyMessage = "Ce compte a été suspendu. Veuillez contacter le support Galant pour plus d'informations.";
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = "Trop de tentatives échouées. Votre compte a été temporairement bloqué par sécurité. Réessayez plus tard.";
      } else if (error.code === 'auth/network-request-failed') {
        friendlyMessage = "Problème de connexion internet. Veuillez vérifier votre réseau et réessayer.";
      } else if (error.code === 'auth/internal-error') {
        friendlyMessage = "Une erreur technique est survenue. Nos équipes travaillent à sa résolution.";
      }

      showAlert('Authentification', friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(fbAuth, provider);
      navigate('/');
    } catch (error: any) {
      showAlert('Google Error', "Impossible de se connecter avec Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      await signInWithPopup(fbAuth, provider);
      navigate('/');
    } catch (error: any) {
      showAlert('Apple Error', "Impossible de se connecter avec Apple.");
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
            {mode === 'reset' && (
              <button
                onClick={() => setMode('login')}
                className="mb-4 text-slate-400 hover:text-primary transition-colors flex items-center gap-2 font-bold text-xs uppercase"
              >
                <ArrowLeft size={16} /> Retour
              </button>
            )}
            <h2 className="text-3xl font-black text-slate-900 leading-none">
              {mode === 'login' ? t('login') : mode === 'signup' ? t('welcome') : 'Réinitialisation'}
            </h2>
            <p className="text-slate-500 mt-3 font-medium text-sm">
              {mode === 'login' ? 'Heureux de vous revoir parmi nous.' : mode === 'signup' ? t('welcome_subtitle') : 'Saisissez votre email pour recevoir un lien.'}
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

            {mode !== 'reset' && (
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
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    className="text-[11px] font-bold text-primary hover:underline ml-1 mt-1 block"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
            )}

            {mode === 'signup' && (
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
              disabled={loading || (mode === 'signup' && !hasAcceptedLegal)}
              className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-red-100 disabled:opacity-50 mt-4"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Patientez...</span>
                </div>
              ) : (mode === 'login' ? t('login') : mode === 'signup' ? t('continue') : 'Envoyer le lien')}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="h-px bg-slate-100 flex-1"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">OU</span>
            <div className="h-px bg-slate-100 flex-1"></div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <button
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition-all group"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              <span className="text-xs font-bold text-slate-600">Google</span>
            </button>
            <button
              onClick={handleAppleLogin}
              className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-black hover:bg-slate-900 transition-all group"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 384 512"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 21.8-88.5 21.8-11.4 0-51.1-18.1-81.9-18.1-41.9 0-82.6 23.3-104 63.8-43.2 81.3-11.1 201 31 262.3 20.6 29.8 44.4 63.3 76.5 63.3 32.1 0 44.2-20.1 82.9-20.1 38.7 0 49.3 20.1 82.9 20.1 32.7 0 54.5-30.4 75.1-60.5 24.3-35.6 34.3-70 34.6-71.8-1-.4-66.2-25.5-66.4-101.4zM240.4 103.9c18.5-22.3 31-53.3 27.5-84.3-26.7 1.1-59 17.8-78.1 40.5-17.1 20.2-32.2 52.1-28.7 82.2 29.7 2.3 59.8-16 79.3-38.4z"/></svg>
              <span className="text-xs font-bold text-white">Apple</span>
            </button>
          </div>

          <div className="mt-10 flex flex-col gap-4">
            {mode !== 'reset' && (
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-slate-500 font-bold hover:text-primary transition-colors text-sm uppercase"
              >
                {mode === 'login' ? "Pas encore membre ? S'inscrire" : "Déjà un compte ? Se connecter"}
              </button>
            )}
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
