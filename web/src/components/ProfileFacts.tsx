import React from 'react';
import { getProfileFactItems, type ProfileFactProfile, type ProfileLanguage } from '@shared/lib/profileFacts';

interface Props {
  profile: ProfileFactProfile;
  language: ProfileLanguage;
  variant?: 'chips' | 'panel' | 'overlay';
  includeLocation?: boolean;
  includeStatus?: boolean;
  className?: string;
}

const ProfileFacts: React.FC<Props> = ({
  profile,
  language,
  variant = 'chips',
  includeLocation = false,
  includeStatus = false,
  className = '',
}) => {
  const items = getProfileFactItems(profile, language, { includeLocation, includeStatus });
  if (items.length === 0) return null;

  if (variant === 'panel') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
        {items.map((item) => (
          <div key={item.key} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl space-y-1 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-prestige transition-colors">
              {item.label}
            </span>
            <p className="font-bold text-slate-700 dark:text-slate-300 transition-colors">{item.value}</p>
          </div>
        ))}
      </div>
    );
  }

  const chipClass = variant === 'overlay'
    ? 'bg-black/30 border-white/15 text-white/90 backdrop-blur-md'
    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300';

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((item) => (
        <span
          key={item.key}
          className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${chipClass}`}
          title={`${item.label}: ${item.value}`}
        >
          <span className="truncate">{item.value}</span>
        </span>
      ))}
    </div>
  );
};

export default ProfileFacts;
