import React from 'react';
import { ChevronLeft, ShieldCheck, EyeOff, Trash2, Database, Mail, UserCog, ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();
  const handleBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-6 pb-20">
      <button onClick={handleBack} className="mb-8 flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold text-sm hover:text-primary transition-colors">
        <ChevronLeft size={20} /> RETOUR
      </button>

      <div className="space-y-12">
        <header className="space-y-4">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center transition-colors">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-4xl font-sans  tracking-tighter text-slate-900 dark:text-white transition-colors">Politique de Confidentialité</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium  transition-colors">Respecter votre vie privée est notre priorité absolue.</p>
        </header>

        <section className="space-y-6">
          <div className="flex items-center gap-3 text-blue-500 font-medium uppercase text-xs tracking-prestige transition-colors">
            <Database size={16} /> 1. Données Collectées
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium transition-colors">
            Nous collectons les informations nécessaires au fonctionnement du service : identité (nom, âge, genre), position géographique (GPS), photos de profil et documents de vérification KYC (CNI/Passeport). Ces données nous permettent de vous proposer une expérience personnalisée et sécurisée.
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 text-blue-500 font-medium uppercase text-xs tracking-prestige transition-colors">
            <Trash2 size={16} /> 2. Éphémérité & Suppression
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-8 rounded-[2rem] border border-blue-100 dark:border-blue-900/20 space-y-4 transition-colors">
            <p className="text-slate-700 dark:text-slate-200 font-bold transition-colors">Votre empreinte numérique est réduite au minimum :</p>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400 text-sm font-medium transition-colors">
              <li className="flex items-center gap-2">• Les Stories sont supprimées après <span className="text-blue-600 dark:text-blue-400 font-black transition-colors">24 heures</span>.</li>
              <li className="flex items-center gap-2">• Les médias de chat (images/vidéos) sont supprimés après <span className="text-blue-600 dark:text-blue-400 font-black transition-colors">30 jours</span>.</li>
              <li className="flex items-center gap-2">• Les documents KYC sont archivés de manière sécurisée une fois validés.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 text-blue-500 font-medium uppercase text-xs tracking-prestige transition-colors">
            <ShieldOff size={16} /> 3. Non-partage des données
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium transition-colors">
            <span className="font-bold text-slate-900 dark:text-white transition-colors">Galant ne vend jamais vos données personnelles.</span> Nous ne partageons vos informations avec des tiers que dans le cadre strict de l'exécution du service (ex: traitement des paiements via Paystack) ou pour répondre à des obligations légales.
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 text-blue-500 font-medium uppercase text-xs tracking-prestige transition-colors">
            <UserCog size={16} /> 4. Vos Droits
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium transition-colors">
            Conformément aux réglementations sur la protection des données, vous disposez d'un droit d'accès, de rectification et de suppression de vos informations. Vous pouvez à tout moment demander la suppression définitive de votre compte directement depuis les réglages de votre profil.
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 text-blue-500 font-medium uppercase text-xs tracking-prestige transition-colors">
            <EyeOff size={16} /> 5. Sécurité des Échanges
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-sm transition-colors">
            Tous les échanges de données entre votre appareil et nos serveurs sont protégés par un chiffrement SSL. Vos informations de paiement ne transitent jamais par nos serveurs et sont gérées directement par notre partenaire certifié PCI-DSS : Paystack.
          </p>
        </section>

        <section className="space-y-6 pt-10 border-t border-slate-100 dark:border-white/5 transition-colors">
          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 font-medium uppercase text-xs tracking-prestige transition-colors">
            <Mail size={16} /> 6. Contact Légal & Régulation
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed transition-colors">
            Conformément à la Loi n° 2013-450, le traitement des données à caractère personnel de Galant fait l'objet d'une déclaration auprès de l'Autorité de Régulation des Télécommunications/TIC de Côte d’Ivoire (<span className="font-bold">ARTCI</span>). <br/><br/>
            Pour toute question concernant vos données personnelles ou pour exercer vos droits, vous pouvez contacter notre responsable à l'adresse : <br/>
            <span className="text-primary font-black">privacy@galant.app</span>
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPage;
