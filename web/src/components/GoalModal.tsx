import React from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, Users, Briefcase, Coffee, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type RelationshipGoalId = 'SERIOUS' | 'FRIENDSHIP' | 'NETWORKING' | 'CASUAL';

export const RELATIONSHIP_GOALS = [
  {
    id: 'SERIOUS' as RelationshipGoalId,
    label: { fr: 'Amour sérieux', en: 'Serious love' },
    icon: Heart,
    color: 'text-primary',
    bg: 'bg-rose-50'
  },
  {
    id: 'FRIENDSHIP' as RelationshipGoalId,
    label: { fr: 'Amitié', en: 'Friendship' },
    icon: Users,
    color: 'text-blue-500',
    bg: 'bg-blue-50'
  },
  {
    id: 'NETWORKING' as RelationshipGoalId,
    label: { fr: 'Réseautage', en: 'Networking' },
    icon: Briefcase,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50'
  },
  {
    id: 'CASUAL' as RelationshipGoalId,
    label: { fr: 'On verra bien', en: 'Let us see' },
    icon: Coffee,
    color: 'text-amber-500',
    bg: 'bg-amber-50'
  },
];

export const getRelationshipGoalLabel = (goalId?: string | null, language: 'fr' | 'en' = 'fr') => {
  const goal = RELATIONSHIP_GOALS.find((item) => item.id === goalId);
  return goal?.label[language] || (language === 'en' ? 'Set my goal' : 'Définir mon objectif');
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentGoalId: string;
  onUpdateGoal: (goalId: string) => void;
}

const copy = {
  fr: {
    title: 'Que cherchez-vous ?',
    selected: 'Sélectionné',
    choose: 'Cliquer pour choisir',
    close: 'Fermer'
  },
  en: {
    title: 'What are you looking for?',
    selected: 'Selected',
    choose: 'Tap to choose',
    close: 'Close'
  }
};

const GoalModal: React.FC<Props> = ({ isOpen, onClose, currentGoalId, onUpdateGoal }) => {
  const { language } = useAuth();
  const c = copy[language] || copy.fr;

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center px-4 py-3">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md max-h-[calc(100dvh-8.5rem)] rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-white/10 flex flex-col">
        <div className="px-5 py-4 sm:p-8 border-b border-slate-50 dark:border-white/5 flex justify-between items-start gap-4 shrink-0">
          <h3 className="text-xl sm:text-2xl leading-tight font-black text-slate-900 dark:text-white">{c.title}</h3>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full text-slate-300 shrink-0" aria-label={c.close}>
            <X size={22} />
          </button>
        </div>

        <div className="px-5 py-5 sm:p-8 space-y-3 sm:space-y-4 overflow-y-auto">
          {RELATIONSHIP_GOALS.map((goal) => {
            const active = currentGoalId === goal.id;
            return (
              <button
                key={goal.id}
                onClick={() => onUpdateGoal(goal.id)}
                className={`w-full p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 transition-all flex items-center gap-4 sm:gap-5 text-left ${
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-100 dark:border-transparent bg-white dark:bg-white/5 hover:border-slate-300 dark:hover:bg-white/10'
                }`}
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                  active ? 'bg-primary text-white shadow-lg shadow-red-200' : `${goal.bg} ${goal.color}`
                }`}>
                  <goal.icon size={24} />
                </div>
                <div className="flex-1">
                  <p className={`font-black text-sm uppercase tracking-tight ${active ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                    {goal.label[language]}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    {active ? c.selected : c.choose}
                  </p>
                </div>
                {active && <CheckCircle size={22} className="text-primary" />}
              </button>
            );
          })}
        </div>

        <div className="px-5 py-4 sm:p-8 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 text-center shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 dark:shadow-none hover:bg-black dark:hover:bg-slate-200 transition-all active:scale-95"
          >
            {c.close}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default GoalModal;
