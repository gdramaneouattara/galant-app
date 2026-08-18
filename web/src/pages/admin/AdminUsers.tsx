import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '@shared/lib/api';
import {
  Search, ShieldCheck, Gem, Star, Ban,
  RotateCcw, Crown, UserPlus
} from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';

interface AdminUser {
  id: string;
  name: string;
  email?: string;
  gender: string;
  city: string | null;
  photos: string[];
  is_verified: boolean;
  is_premium: boolean;
  is_vip?: boolean;
  can_invite?: boolean;
  suspended_at: string | null;
  galanterie_score: number;
  created_at: string;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({
    gender: 'ALL',
    is_premium: false,
    is_verified: false,
    isSuspended: false
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter.gender !== 'ALL') params.set('gender', filter.gender);
      if (filter.is_premium) params.set('is_premium', 'true');
      if (filter.is_verified) params.set('is_verified', 'true');
      if (filter.isSuspended) params.set('isSuspended', 'true');

      const data = await apiRequest<{ users: AdminUser[] }>(`/api/admin/users?${params.toString()}`, {
        requireAuth: true
      });
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggle = async (userId: string, field: string, currentValue: any) => {
    try {
      // Pour suspended_at, on bascule entre null et ISO date
      const newValue = field === 'suspended_at'
        ? (currentValue ? null : new Date().toISOString())
        : !currentValue;

      await apiRequest(`/api/admin/users/${userId}/toggle-status`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ field, value: newValue })
      });

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: newValue } : u));
      showAlert('Mis à jour', 'Le statut de l\'utilisateur a été modifié.');
    } catch (error: any) {
      showAlert('Erreur', error.message);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Membres</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-lg">Gérez la base de données des utilisateurs.</p>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-[2rem] shadow-xl dark:shadow-none border border-slate-50 dark:border-white/5 flex flex-wrap gap-3 sm:gap-4 items-center transition-colors">
        <div className="relative w-full flex-1 sm:min-w-[300px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email ou ville..."
            className="w-full bg-slate-50 dark:bg-slate-800 border-none px-12 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium text-slate-900 dark:text-white"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
        </div>

        <select
          value={filter.gender}
          onChange={(e) => setFilter({...filter, gender: e.target.value})}
          className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800 border-none px-6 py-4 rounded-2xl outline-none font-bold text-xs uppercase text-slate-500 dark:text-slate-400"
        >
          <option value="ALL">Tous les genres</option>
          <option value="MALE">Hommes</option>
          <option value="FEMALE">Femmes</option>
        </select>

        <div className="flex w-full items-center gap-2 overflow-x-auto sm:w-auto">
           <button
             onClick={() => setFilter({...filter, is_premium: !filter.is_premium})}
             className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${filter.is_premium ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200 dark:shadow-none' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/10 text-slate-400 dark:text-slate-500'}`}
           >
             Premium
           </button>
           <button
             onClick={() => setFilter({...filter, is_verified: !filter.is_verified})}
             className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${filter.is_verified ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-200 dark:shadow-none' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/10 text-slate-400 dark:text-slate-500'}`}
           >
             Vérifiés
           </button>
           <button
             onClick={() => setFilter({...filter, isSuspended: !filter.isSuspended})}
             className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${filter.isSuspended ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-200 dark:shadow-none' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/10 text-slate-400 dark:text-slate-500'}`}
           >
             Bannis
           </button>
        </div>
      </div>

      {/* Liste des Utilisateurs */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] shadow-2xl dark:shadow-none border border-slate-50 dark:border-white/5 overflow-x-auto transition-colors">
        <table className="min-w-[720px] w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] border-b border-slate-100 dark:border-white/5">
              <th className="px-8 py-6">Membre</th>
              <th className="px-6 py-6">Status</th>
              <th className="px-6 py-6">Galanterie</th>
              <th className="px-6 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-white/5">
            {loading ? (
              <tr><td colSpan={4} className="py-20 text-center animate-pulse font-bold text-slate-300 dark:text-slate-700 italic">Chargement des membres...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="py-20 text-center font-bold text-slate-300 dark:text-slate-700 italic">Aucun membre ne correspond à ces critères.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors ${u.suspended_at ? 'opacity-50 grayscale' : ''}`}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md border-2 border-white dark:border-slate-800 flex-shrink-0">
                        <img src={u.photos?.[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          {u.name}
                          {u.is_vip && <Crown size={12} className="text-amber-500" fill="currentColor" />}
                        </p>
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate">{u.city || 'Ville inconnue'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex gap-2">
                      {u.is_premium && <Gem size={16} className="text-amber-500" />}
                      {u.is_verified && <ShieldCheck size={16} className="text-blue-500" />}
                      {u.suspended_at && <Ban size={16} className="text-red-500" />}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-black text-primary italic flex items-center gap-1">
                      <Star size={12} fill="currentColor" /> {u.galanterie_score || '5.0'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleToggle(u.id, 'is_verified', u.is_verified)}
                        className={`p-2 rounded-xl transition-all ${u.is_verified ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-white/5 text-slate-300 dark:text-slate-700 hover:text-blue-500'}`}
                        title="Vérifier"
                      >
                        <ShieldCheck size={18} />
                      </button>
                      <button
                        onClick={() => handleToggle(u.id, 'is_vip', u.is_vip)}
                        className={`p-2 rounded-xl transition-all ${u.is_vip ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-slate-50 dark:bg-white/5 text-slate-300 dark:text-slate-700 hover:text-amber-500'}`}
                        title="VIP"
                      >
                        <Crown size={18} />
                      </button>
                      <button
                        onClick={() => handleToggle(u.id, 'can_invite', u.can_invite)}
                        className={`p-2 rounded-xl transition-all ${u.can_invite ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-white/5 text-slate-300 dark:text-slate-700 hover:text-emerald-500'}`}
                        title="Programme Ambassadeur"
                      >
                        <UserPlus size={18} />
                      </button>
                      <button
                        onClick={() => handleToggle(u.id, 'suspended_at', u.suspended_at)}
                        className={`p-2 rounded-xl transition-all ${u.suspended_at ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-slate-50 dark:bg-white/5 text-slate-300 dark:text-slate-700 hover:text-red-500'}`}
                        title={u.suspended_at ? 'Réactiver' : 'Bannir'}
                      >
                        {u.suspended_at ? <RotateCcw size={18} /> : <Ban size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
