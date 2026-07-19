import React, { useState } from 'react';
import AgendaPage from './AgendaPage';
import GuidePage from './GuidePage';
import { Calendar, MapPin } from 'lucide-react';

const ExperiencesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AGENDA' | 'GUIDE'>('AGENDA');

  return (
    <div className="w-full">
      <div className="flex justify-center mb-8 sticky top-20 z-40">
        <div className="bg-white p-1.5 rounded-[2rem] flex gap-1 shadow-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('AGENDA')}
            className={`flex items-center gap-2 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'AGENDA'
                ? 'bg-slate-900 text-white'
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
                ? 'bg-slate-900 text-white'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <MapPin size={16} />
            Guide
          </button>
        </div>
      </div>

      <div className="px-2">
        {activeTab === 'AGENDA' ? <AgendaPage /> : <GuidePage />}
      </div>
    </div>
  );
};

export default ExperiencesPage;
