import React, { useEffect, useState } from 'react';
import {
  History as HistoryIcon,
  Search,
  RefreshCw,
  User,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Filter
} from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';

const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<any[]>('/api/admin/audit-logs', { requireAuth: true });
      setLogs(res || []);
    } catch (e: any) {
      showAlert('Erreur', 'Impossible de charger l\'historique d\'audit.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes('APPROVE') || action.includes('VALIDATE')) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10';
    if (action.includes('REJECT') || action.includes('SUSPEND') || action.includes('DELETE')) return 'text-red-500 bg-red-50 dark:bg-red-500/10';
    return 'text-blue-500 bg-blue-50 dark:bg-blue-500/10';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-sans  tracking-tighter text-slate-900 dark:text-white sm:text-4xl">Journal d'Audit</h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 sm:text-lg">Traçabilité complète des actions administratives.</p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex justify-center py-40"><RefreshCw className="animate-spin text-slate-300" size={48} /></div>
        ) : logs.length === 0 ? (
          <div className="p-24 text-center space-y-4">
             <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-200">
               <HistoryIcon size={40} />
             </div>
             <p className="font-bold text-slate-400 text-lg">Aucune action enregistrée pour le moment.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-white/5">
            {logs.map((log) => (
              <div key={log.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all group">
                <div className="flex gap-5 flex-1 min-w-0">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${getActionColor(log.action)}`}>
                    {log.action.includes('KYC') ? <User size={24} /> : <ShieldAlert size={24} />}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                      Effectuée par <span className="text-primary font-bold">{log.admin_name || 'Système'}</span> sur l'entité <span className="font-bold text-slate-700 dark:text-slate-200">{log.target_name || log.target_id}</span>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg">
                    <Clock size={12} />
                    {new Date(log.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <button className="p-2 text-slate-300 hover:text-primary transition-all opacity-0 group-hover:opacity-100">
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;
