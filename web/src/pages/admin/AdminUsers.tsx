import React, { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '@shared/lib/api';
import {
  Search, ShieldCheck, Gem, User as UserIcon,
  MoreVertical, MapPin, Star, Ban, CheckCircle,
  RotateCcw, Filter, Crown
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
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Membres</h2>
          <p className="text-slate-500 font-medium mt-1 text-lg">Gérez la base de données des utilisateurs.</p>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-50 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email ou ville..."
            className="w-full bg-slate-50 border-none px-12 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        </div>

        <select
          value={filter.gender}
          onChange={(e) => setFilter({...filter, gender: e.target.value})}
          className="bg-slate-50 border-none px-6 py-4 rounded-2xl outline-none font-bold text-xs uppercase text-slate-500"
        >
          <option value="ALL">Tous les genres</option>
          <option value="MALE">Hommes</option>
          <option value="FEMALE">Femmes</option>
        </select>

        <div className="flex items-center gap-2">
           <button
             onClick={() => setFilter({...filter, is_premium: !filter.is_premium})}
             className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${filter.is_premium ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white border-slate-100 text-slate-400'}`}
           >
             Premium
           </button>
           <button
             onClick={() => setFilter({...filter, is_verified: !filter.is_verified})}
             className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${filter.is_verified ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-100 text-slate-400'}`}
           >
             Vérifiés
           </button>
           <button
             onClick={() => setFilter({...filter, isSuspended: !filter.isSuspended})}
             className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${filter.isSuspended ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-200' : 'bg-white border-slate-100 text-slate-400'}`}
           >
             Bannis
           </button>
        </div>
      </div>

      {/* Liste des Utilisateurs */}
      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-50 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] border-b border-slate-100">
              <th className="px-8 py-6">Membre</th>
              <th className="px-6 py-6">Status</th>
              <th className="px-6 py-6">Galanterie</th>
              <th className="px-6 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={4} className="py-20 text-center animate-pulse font-bold text-slate-300 italic">Chargement des membres...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="py-20 text-center font-bold text-slate-300 italic">Aucun membre ne correspond à ces critères.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${u.suspended_at ? 'opacity-50 grayscale' : ''}`}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md border-2 border-white flex-shrink-0">
                        <img src={u.photos?.[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 flex items-center gap-1.5">
                          {u.name}
                          {u.is_vip && <Crown size={12} className="text-amber-500" fill="currentColor" />}
                        </p>
                        <p className="text-xs font-medium text-slate-400 truncate">{u.city || 'Ville inconnue'}</p>
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
                        className={`p-2 rounded-xl transition-all ${u.is_verified ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-300 hover:text-blue-500'}`}
                        title="Vérifier"
                      >
                        <ShieldCheck size={18} />
                      </button>
                      <button
                        onClick={() => handleToggle(u.id, 'is_vip', u.is_vip)}
                        className={`p-2 rounded-xl transition-all ${u.is_vip ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-300 hover:text-amber-500'}`}
                        title="VIP"
                      >
                        <Crown size={18} />
                      </button>
                      <button
                        onClick={() => handleToggle(u.id, 'suspended_at', u.suspended_at)}
                        className={`p-2 rounded-xl transition-all ${u.suspended_at ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-300 hover:text-red-500'}`}
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
