import React from 'react';
import { ChevronLeft, Scale, ShieldAlert, CreditCard, UserCheck, Copyright, Gavel, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto py-10 px-6 pb-20">
      <button onClick={() => navigate(-1)} className="mb-8 flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-primary transition-colors">
        <ChevronLeft size={20} /> RETOUR
      </button>

      <div className="space-y-12">
        <header className="space-y-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
            <Scale size={32} />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter text-slate-900">Conditions Générales d'Utilisation</h1>
          <p className="text-slate-500 font-medium italic">Version 1.2 - Spéciale Côte d'Ivoire - Juillet 2026</p>
        </header>

        {/* 1. ADMISSIBILITÉ */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-primary font-black uppercase text-xs tracking-widest">
            <UserCheck size={16} /> 1. Admissibilité & Certification
          </div>
          <p className="text-slate-600 leading-relaxed font-medium">
            L'accès à Galant est réservé aux personnes majeures (18 ans et plus). Pour garantir le standing de la communauté, tout membre doit se soumettre au processus de vérification KYC (identité) géré par notre IA. Galant se réserve le droit de refuser tout profil ne répondant pas aux critères d'élégance et d'authenticité de la plateforme.
          </p>
        </section>

        {/* 2. PROPRIÉTÉ INTELLECTUELLE */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-primary font-black uppercase text-xs tracking-widest">
            <Copyright size={16} /> 2. Propriété Intellectuelle
          </div>
          <p className="text-slate-600 leading-relaxed font-medium">
            L'interface, le logo, le nom "Galant", les algorithmes de matchmaking et le système de Conciergerie IA sont la propriété exclusive de l'Éditeur. Toute reproduction, même partielle, est strictement interdite et fera l'objet de poursuites.
          </p>
        </section>

        {/* 3. CODE DE CONDUITE */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-primary font-black uppercase text-xs tracking-widest">
            <ShieldAlert size={16} /> 3. Code de la Galanterie
          </div>
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl space-y-4">
            <p className="text-primary font-black italic uppercase tracking-widest text-xs">Charte d'Honneur</p>
            <p className="text-slate-300 text-sm leading-relaxed">
              Tout harcèlement, propos injurieux, ou comportement portant atteinte à la dignité d'un membre entraînera une suspension immédiate et définitive. Galant utilise une modération hybride (IA et Humaine) pour veiller au respect de cette charte 24h/24.
            </p>
          </div>
        </section>

        {/* 4. FINANCES */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-primary font-black uppercase text-xs tracking-widest">
            <CreditCard size={16} /> 4. Achats & Abonnements
          </div>
          <p className="text-slate-600 leading-relaxed font-medium">
            Les Roses d'Or et Abonnements Premium sont des services numériques consommables. <span className="font-bold text-slate-900">Aucun remboursement</span> ne sera accordé une fois le service activé ou la Rose consommée. Les paiements sont sécurisés par Paystack et acceptent les moyens locaux (Orange Money, MTN MoMo, Wave).
          </p>
        </section>

        {/* 5. PARTENAIRES BUSINESS */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-primary font-black uppercase text-xs tracking-widest">
            <Building2 size={16} /> 5. Engagements des Partenaires
          </div>
          <p className="text-slate-600 leading-relaxed font-medium text-sm">
            Les établissements partenaires figurant dans le Guide s'engagent à fournir les avantages promis aux membres Galant et à maintenir un standing conforme à l'image de l'application. Galant décline toute responsabilité en cas de litige commercial entre un membre et un établissement.
          </p>
        </section>

        {/* 6. JURIDICTION */}
        <section className="space-y-4 pt-10 border-t border-slate-100">
          <div className="flex items-center gap-3 text-slate-900 font-black uppercase text-xs tracking-widest">
            <Gavel size={16} /> 6. Loi Applicable & Litiges
          </div>
          <p className="text-slate-600 leading-relaxed font-medium">
            Les présentes CGU sont régies par les lois de la <span className="font-bold">République de Côte d'Ivoire</span>. Le clic de validation de la case à cocher lors de l'inscription vaut <span className="text-primary font-bold">signature électronique</span> au sens de la Loi n° 2013-546. En cas de litige et à défaut de résolution amiable, les tribunaux d'Abidjan seront seuls compétents.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;
