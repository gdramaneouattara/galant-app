import React from 'react';
import { X, Heart, Users, Coffee, CheckCircle } from 'lucide-react';

export const RELATIONSHIP_GOALS = [
  { id: 'SERIOUS', label: 'Amour sérieux', icon: Heart, color: 'text-primary', bg: 'bg-rose-50' },
  { id: 'FRIENDSHIP', label: 'Amitié', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'CASUAL', label: 'On verra bien', icon: Coffee, color: 'text-amber-500', bg: 'bg-amber-50' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentGoalId: string;
  onUpdateGoal: (goalId: string) => void;
}

const GoalModal: React.FC<Props> = ({ isOpen, onClose, currentGoalId, onUpdateGoal }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-white/10">
        <div className="p-8 border-b border-slate-50 dark:border-white/5 flex justify-between items-center">
          <h3 className="text-2xl font-black italic text-slate-900 dark:text-white">Que cherchez-vous ?</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full text-slate-300">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-4">
          {RELATIONSHIP_GOALS.map((goal) => {
            const active = currentGoalId === goal.id;
            return (
              <button
                key={goal.id}
                onClick={() => onUpdateGoal(goal.id)}
                className={`w-full p-6 rounded-[2rem] border-2 transition-all flex items-center gap-5 text-left ${
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-100 dark:border-transparent bg-white dark:bg-white/5 hover:border-slate-300 dark:hover:bg-white/10'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                  active ? 'bg-primary text-white shadow-lg shadow-red-200' : `${goal.bg} ${goal.color}`
                }`}>
                  <goal.icon size={28} />
                </div>
                <div className="flex-1">
                  <p className={`font-black text-sm uppercase tracking-tight ${active ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                    {goal.label}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    {active ? 'Sélectionné' : 'Cliquer pour choisir'}
                  </p>
                </div>
                {active && <CheckCircle size={24} className="text-primary" />}
              </button>
            );
          })}
        </div>

        <div className="p-8 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 text-center">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 dark:shadow-none hover:bg-black dark:hover:bg-slate-200 transition-all active:scale-95"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalModal;
