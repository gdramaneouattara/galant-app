import React, { useState } from 'react';
import AgendaPage from './AgendaPage';
import GuidePage from './GuidePage';
import { Calendar, MapPin } from 'lucide-react';

const ExperiencesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AGENDA' | 'GUIDE'>('AGENDA');

  return (
    <div className="space-y-8">
      {/* Bascule Mobile / Web Premium */}
      <div className="flex justify-center sticky top-20 z-40 py-2">
        <div className="bg-white/80 backdrop-blur-xl p-1.5 rounded-[2rem] flex gap-1 shadow-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('AGENDA')}
            className={`flex items-center gap-2 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'AGENDA'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calendar size={16} />
            Agenda
          </button>
          <button
            onClick={() => setActiveTab('GUIDE')}
            className={`flex items-center gap-2 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'GUIDE'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin size={16} />
            Guide
          </button>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        {activeTab === 'AGENDA' ? <AgendaPage /> : <GuidePage />}
      </div>
    </div>
  );
};

export default ExperiencesPage;
