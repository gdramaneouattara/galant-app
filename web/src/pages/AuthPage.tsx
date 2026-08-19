import React, { useState, useEffect } from 'react';
import { fbAuth } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { showAlert } from '@shared/lib/ui-bridge';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, CheckSquare, Square, ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import logoImg from '../assets/galant-logo-web.png';

const AuthPage: React.FC = () => {
  const { user, reloadUser, t, language } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'verify'>('login');
  const [email, setEmail] = useState('');

  // Auto-detect verification mode if user is logged in but not verified
  useEffect(() => {
    if (user && !user.emailVerified) {
      setMode('verify');
      setEmail(user.email || '');
    }
  }, [user]);

  // Polling for email verification status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === 'verify' && user && !user.emailVerified) {
      interval = setInterval(async () => {
        await reloadUser();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, user, reloadUser]);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const labels = language === 'en'
    ? {
        email: 'Email address',
        password: 'Password',
        forgotPassword: 'Forgot password?',
        acceptTerms: 'I accept the',
        terms: 'Terms',
        privacy: 'Privacy Policy',
        and: 'and the',
        wait: 'Please wait...',
        sendLink: 'Send link',
        or: 'OR',
        switchToSignup: 'Not a member yet? Sign up',
        switchToLogin: 'Already have an account? Log in',
        useAnotherEmail: 'Use another email address',
        partnerQuestion: 'Are you a venue?',
        partnerCta: 'Become a Galant Partner'
      }
    : {
        email: 'Adresse Email',
        password: 'Mot de passe',
        forgotPassword: 'Mot de passe oublié ?',
        acceptTerms: "J'accepte les",
        terms: 'CGU',
        privacy: 'Politique de confidentialité',
        and: 'et la',
        wait: 'Patientez...',
        sendLink: 'Envoyer le lien',
        or: 'OU',
        switchToSignup: "Pas encore membre ? S'inscrire",
        switchToLogin: 'Déjà un compte ? Se connecter',
        useAnotherEmail: 'Utiliser une autre adresse email',
        partnerQuestion: 'Vous êtes un établissement ?',
        partnerCta: 'Devenez Partenaire Galant'
      };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !hasAcceptedLegal) {
      showAlert(t('consent_required'), t('consent_required_body'));
      return;
    }
    setLoading(true);
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/auth',
        handleCodeInApp: true,
      };

      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(fbAuth, email, password);
        if (cred.user && !cred.user.emailVerified) {
          await sendEmailVerification(cred.user, actionCodeSettings);
          setMode('verify');
        } else {
          navigate('/');
        }
      } else if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(fbAuth, email, password);
        await sendEmailVerification(cred.user, actionCodeSettings);
        setMode('verify');
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(fbAuth, (email || '').trim().toLowerCase());
        showAlert(t('email_sent'), t('reset_email_sent'));
        setMode('login');
      }
    } catch (error: any) {
      console.error('Auth Error:', error.code);
      let friendlyMessage = t('auth_unknown_error');

      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = t('email_already_used');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        friendlyMessage = t('invalid_credentials');
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = t('invalid_email');
      } else if (error.code === 'auth/weak-password') {
        friendlyMessage = t('weak_password');
      } else if (error.code === 'auth/user-disabled') {
        friendlyMessage = `${t('account_suspended')}. ${t('contact_support')}`;
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = t('too_many_attempts');
      } else if (error.code === 'auth/network-request-failed') {
        friendlyMessage = t('network_error');
      } else if (error.code === 'auth/internal-error') {
        friendlyMessage = t('technical_error');
      }

      showAlert(t('auth_title'), friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (fbAuth.currentUser) {
      setLoading(true);
      try {
        await sendEmailVerification(fbAuth.currentUser);
        showAlert(t('email_resent'), t('verification_email_resent'));
      } catch (e) {
        showAlert(t('error'), t('resend_email_failed'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(fbAuth, provider);
      navigate('/');
    } catch (error: any) {
      showAlert(t('google_error'), t('google_signin_failed'));
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
      showAlert(t('apple_error'), t('apple_signin_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md flex flex-col items-center py-10">
        {/* Header avec Logo */}
        <div className="mb-10 text-center flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top duration-700">
          <img src={logoImg} alt="Galant Logo" className="w-20 h-20 rounded-[2rem] shadow-2xl border-4 border-white/20 object-contain bg-white/90" />
          <div>
            <h1 className="text-5xl font-sans font-black text-white  mb-2 drop-shadow-2xl">
              GALANT
            </h1>
            <div className="h-1.5 w-12 bg-primary mx-auto rounded-full shadow-lg shadow-red-500/50"></div>
          </div>
        </div>

        <div className="w-full p-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-white/20 dark:border-white/10 transition-colors">
          <div className="mb-8 text-center md:text-left">
            {mode === 'reset' && (
              <button
                onClick={() => setMode('login')}
                className="mb-4 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors flex items-center gap-2 font-bold text-xs uppercase"
              >
                <ArrowLeft size={16} /> {t('back_to_login')}
              </button>
            )}
            <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-none transition-colors">
              {mode === 'login' ? t('login') : mode === 'signup' ? t('welcome') : mode === 'reset' ? t('reset_password_title') : t('verification_title')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-3 font-medium text-sm transition-colors">
              {mode === 'login' ? t('login_subtitle') :
               mode === 'signup' ? t('welcome_subtitle') :
               mode === 'reset' ? t('reset_password_prompt') :
               t('confirm_email_prompt')}
            </p>
          </div>

          {mode === 'verify' ? (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 text-center py-4">
               <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] flex items-center justify-center mx-auto text-primary mb-6 animate-bounce">
                  <Mail size={40} />
               </div>
               <div className="space-y-4">
                  <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed transition-colors">
                     {t('confirmation_email_sent_prefix')} <span className="font-bold text-slate-900 dark:text-white">{email}</span>.
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-loose transition-colors">
                     {t('confirm_email_instruction')}
                  </p>
               </div>

               <div className="pt-6 space-y-4">
                  <button
                    onClick={async () => {
                      await reloadUser();
                      if (fbAuth.currentUser?.emailVerified) {
                        navigate('/');
                      } else {
                        showAlert(t('not_verified'), t('not_verified_body'));
                      }
                    }}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black dark:hover:bg-slate-100 transition-all"
                  >
                    <RefreshCw size={16} /> {t('email_confirmed_button')}
                  </button>
                  <button
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:underline"
                  >
                    {t('resend_confirmation_email')}
                  </button>
               </div>
            </div>
          ) : (
            <>
            <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 transition-colors">{labels.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="exemple@galant.com"
                required
              />
            </div>

            {mode !== 'reset' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 transition-colors">{labels.password}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors"
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
                    {labels.forgotPassword}
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
                <div className={`mt-0.5 shrink-0 transition-colors ${hasAcceptedLegal ? 'text-primary' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-400 dark:group-hover:text-slate-600'}`}>
                  {hasAcceptedLegal ? <CheckSquare size={20} /> : <Square size={20} />}
                </div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed transition-colors">
                  {labels.acceptTerms} <Link to="/cgu" className="text-primary hover:underline">{labels.terms}</Link> {labels.and} <Link to="/privacy" className="text-primary hover:underline">{labels.privacy}</Link>.
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
                  <span>{labels.wait}</span>
                </div>
              ) : (mode === 'login' ? t('login') : mode === 'signup' ? t('continue') : labels.sendLink)}
            </button>
          </form>
          </>
          )}

          {mode !== 'verify' && (
            <>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-px bg-slate-100 dark:bg-white/10 flex-1 transition-colors"></div>
              <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest transition-colors">{labels.or}</span>
              <div className="h-px bg-slate-100 dark:bg-white/10 flex-1 transition-colors"></div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <button
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group shadow-sm"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors">Google</span>
              </button>
              <button
                onClick={handleAppleLogin}
                className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-black dark:bg-white hover:bg-slate-900 dark:hover:bg-slate-100 transition-all group shadow-sm"
              >
                <svg className="w-5 h-5 text-white dark:text-black" fill="currentColor" viewBox="0 0 384 512"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 21.8-88.5 21.8-11.4 0-51.1-18.1-81.9-18.1-41.9 0-82.6 23.3-104 63.8-43.2 81.3-11.1 201 31 262.3 20.6 29.8 44.4 63.3 76.5 63.3 32.1 0 44.2-20.1 82.9-20.1 38.7 0 49.3 20.1 82.9 20.1 32.7 0 54.5-30.4 75.1-60.5 24.3-35.6 34.3-70 34.6-71.8-1-.4-66.2-25.5-66.4-101.4zM240.4 103.9c18.5-22.3 31-53.3 27.5-84.3-26.7 1.1-59 17.8-78.1 40.5-17.1 20.2-32.2 52.1-28.7 82.2 29.7 2.3 59.8-16 79.3-38.4z"/></svg>
                <span className="text-xs font-bold text-white dark:text-black transition-colors">Apple</span>
              </button>
            </div>
            </>
          )}

          <div className="mt-10 flex flex-col gap-4">
            {mode !== 'reset' && mode !== 'verify' && (
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-slate-500 dark:text-slate-400 font-bold hover:text-primary transition-colors text-sm uppercase"
              >
                {mode === 'login' ? labels.switchToSignup : labels.switchToLogin}
              </button>
            )}
            {mode === 'verify' && (
              <button
                onClick={() => {
                  fbAuth.signOut();
                  setMode('login');
                }}
                className="text-slate-400 dark:text-slate-500 font-bold hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-[10px] uppercase tracking-widest"
              >
                {labels.useAnotherEmail}
              </button>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-white/5 text-center transition-colors">
            <button
              onClick={() => navigate('/partner-signup', { state: { from: '/auth' } })}
              className="group flex flex-col items-center gap-2 mx-auto"
            >
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] group-hover:text-primary transition-colors">{labels.partnerQuestion}</span>
              <span className="text-sm font-black text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white group-hover:border-primary group-hover:text-primary transition-all">{labels.partnerCta}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
