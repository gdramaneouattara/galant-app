import React, { useState } from 'react';
import AgendaPage from './AgendaPage';
import GuidePage from './GuidePage';
import { Calendar, MapPin } from 'lucide-react';

const ExperiencesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AGENDA' | 'GUIDE'>('AGENDA');

  return (
    <div className="flex flex-col h-full">
      {/* Bascule Mobile / Web Premium */}
      <div className="flex justify-center mb-8 sticky top-[72px] z-40 py-2">
        <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-[2rem] flex gap-1 shadow-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('AGENDA')}
            className={`flex items-center gap-2 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'AGENDA'
                ? 'bg-primary text-white shadow-lg shadow-red-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar size={16} />
            Agenda
          </button>
          <button
            onClick={() => setActiveTab('GUIDE')}
            className={`flex items-center gap-2 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'GUIDE'
                ? 'bg-primary text-white shadow-lg shadow-red-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin size={16} />
            Guide
          </button>
        </div>
      </div>

      <div className="flex-1 animate-in fade-in duration-500">
        {activeTab === 'AGENDA' ? <AgendaPage /> : <GuidePage />}
      </div>
    </div>
  );
};

export default ExperiencesPage;
